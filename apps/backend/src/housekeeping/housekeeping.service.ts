import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Cleanliness, Prisma, RoomStatus } from '@prisma/client';
import {
  canTransitionTask,
  hasCapability,
  type AuthUser,
  type AutoGenerateTasksResponse,
  type CreateHousekeepingTaskRequest,
  type HousekeepingTaskDto,
  type HousekeepingTaskStatus,
  type HousekeepingTaskType,
  type StaffMemberDto,
  type UpdateHousekeepingTaskRequest,
} from '@guryeeye/shared';
import { OPEN_TASK_STATUSES, taskInclude, toTaskDto } from '../common/mappers';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';

const CLEANING_TYPES: HousekeepingTaskType[] = ['CHECKOUT_CLEAN', 'STAYOVER', 'DEEP_CLEAN', 'TURNDOWN'];
const STAFF_ROLES = ['HOUSEKEEPER', 'MANAGER'] as const;

/** Room side-effects of a task moving to a new status. */
export function roomEffectFor(
  type: HousekeepingTaskType,
  to: HousekeepingTaskStatus,
  roomStatus: RoomStatus,
): { cleanliness?: Cleanliness; status?: RoomStatus } {
  if (type === 'MAINTENANCE') {
    if (to === 'IN_PROGRESS' && roomStatus === 'AVAILABLE') return { status: 'MAINTENANCE' };
    if ((to === 'DONE' || to === 'VERIFIED') && roomStatus === 'MAINTENANCE') return { status: 'AVAILABLE' };
    return {};
  }
  if (type === 'INSPECTION') return to === 'DONE' || to === 'VERIFIED' ? { cleanliness: 'INSPECTED' } : {};
  if (!CLEANING_TYPES.includes(type)) return {};
  switch (to) {
    case 'PENDING':
      return { cleanliness: 'DIRTY' };
    case 'IN_PROGRESS':
      return { cleanliness: 'CLEANING' };
    case 'DONE':
      return { cleanliness: 'CLEAN' };
    case 'VERIFIED':
      return { cleanliness: 'INSPECTED' };
  }
}

@Injectable()
export class HousekeepingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rooms: RoomsService,
    private readonly events: EventsService,
  ) {}

  async list(hotelId: string, status?: HousekeepingTaskStatus): Promise<HousekeepingTaskDto[]> {
    const dayAgo = new Date(Date.now() - 24 * 3600_000);
    const where: Prisma.HousekeepingTaskWhereInput = status
      ? { hotelId, status }
      : // Board view: everything open plus whatever was verified in the last day.
        { hotelId, OR: [{ status: { not: 'VERIFIED' } }, { verifiedAt: { gte: dayAgo } }] };
    const tasks = await this.prisma.housekeepingTask.findMany({
      where,
      include: taskInclude,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 500,
    });
    return tasks.map(toTaskDto);
  }

  async staff(hotelId: string): Promise<StaffMemberDto[]> {
    const users = await this.prisma.user.findMany({
      where: { hotelId, active: true, role: { in: [...STAFF_ROLES] } },
      select: {
        id: true,
        name: true,
        role: true,
        _count: { select: { assignedTasks: { where: { status: { in: [...OPEN_TASK_STATUSES] } } } } },
      },
      orderBy: { name: 'asc' },
    });
    return users.map((u) => ({ id: u.id, name: u.name, role: u.role, openTasks: u._count.assignedTasks }));
  }

  private async assertAssignee(hotelId: string, assigneeId: string | null | undefined): Promise<void> {
    if (!assigneeId) return;
    const user = await this.prisma.user.findFirst({
      where: { id: assigneeId, hotelId, active: true, role: { in: [...STAFF_ROLES] } },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Assignee must be active housekeeping staff of this hotel');
  }

  private publish(hotelId: string, task: Parameters<typeof toTaskDto>[0]): HousekeepingTaskDto {
    const dto = toTaskDto(task);
    this.events.publish({ type: 'task.updated', hotelId, task: dto });
    return dto;
  }

  async create(hotelId: string, body: CreateHousekeepingTaskRequest): Promise<HousekeepingTaskDto> {
    const room = await this.prisma.room.findFirst({ where: { id: body.roomId, hotelId }, select: { id: true } });
    if (!room) throw new BadRequestException('Unknown room for this hotel');
    await this.assertAssignee(hotelId, body.assigneeId);

    const task = await this.prisma.housekeepingTask.create({
      data: {
        hotelId,
        roomId: room.id,
        type: body.type,
        priority: body.priority ?? 'NORMAL',
        assigneeId: body.assigneeId ?? null,
        notes: body.notes?.trim() || null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
      },
      include: taskInclude,
    });
    await this.rooms.broadcast(hotelId, room.id);
    return this.publish(hotelId, task);
  }

  async update(
    hotelId: string,
    taskId: string,
    body: UpdateHousekeepingTaskRequest,
    user: AuthUser,
  ): Promise<HousekeepingTaskDto> {
    const task = await this.prisma.housekeepingTask.findFirst({
      where: { id: taskId, hotelId },
      include: { room: { select: { id: true, status: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const isHousekeeper = user.role === 'HOUSEKEEPER';
    if (isHousekeeper) {
      if (task.assigneeId && task.assigneeId !== user.id) {
        throw new ForbiddenException('This task is assigned to someone else');
      }
      if (body.assigneeId !== undefined && body.assigneeId !== user.id) {
        throw new ForbiddenException('Housekeepers can only assign tasks to themselves');
      }
      if (body.priority !== undefined) throw new ForbiddenException('Housekeepers cannot change priority');
    }

    const data: Prisma.HousekeepingTaskUncheckedUpdateInput = {};
    let roomData: { cleanliness?: Cleanliness; status?: RoomStatus } = {};

    if (body.status && body.status !== task.status) {
      if (!canTransitionTask(task.status, body.status)) {
        throw new BadRequestException(`Cannot move a task from ${task.status} to ${body.status}`);
      }
      if (body.status === 'VERIFIED' && !hasCapability(user.role, 'verifyHousekeeping')) {
        throw new ForbiddenException('Only supervisors can verify housekeeping tasks');
      }
      data.status = body.status;
      const now = new Date();
      if (body.status === 'IN_PROGRESS') {
        data.startedAt = task.startedAt ?? now;
        data.completedAt = null;
        // Starting an unassigned task claims it.
        if (!task.assigneeId && body.assigneeId === undefined && isHousekeeper) data.assigneeId = user.id;
      }
      if (body.status === 'PENDING') data.startedAt = null;
      if (body.status === 'DONE') data.completedAt = now;
      if (body.status === 'VERIFIED') data.verifiedAt = now;
      roomData = roomEffectFor(task.type, body.status, task.room.status);
    }
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
    if (body.assigneeId !== undefined) {
      await this.assertAssignee(hotelId, body.assigneeId);
      data.assigneeId = body.assigneeId;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (roomData.cleanliness || roomData.status) {
        await tx.room.update({ where: { id: task.room.id }, data: roomData });
      }
      return tx.housekeepingTask.update({ where: { id: taskId }, data, include: taskInclude });
    });

    await this.rooms.broadcast(hotelId, task.room.id);
    return this.publish(hotelId, updated);
  }

  /**
   * Creates a cleaning task for every dirty room that has no open task, assigning
   * each to the housekeeper with the fewest open tasks (simple load balancing).
   */
  async autoGenerate(hotelId: string): Promise<AutoGenerateTasksResponse> {
    const rooms = await this.prisma.room.findMany({
      where: {
        hotelId,
        cleanliness: 'DIRTY',
        status: { notIn: ['OUT_OF_ORDER'] },
        housekeepingTasks: { none: { status: { in: [...OPEN_TASK_STATUSES] } } },
      },
      select: { id: true, status: true },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
    if (rooms.length === 0) return { created: 0 };

    const staff = (await this.staff(hotelId)).filter((s) => s.role === 'HOUSEKEEPER');
    const load = new Map(staff.map((s) => [s.id, s.openTasks]));
    const pickAssignee = (): string | null => {
      let best: string | null = null;
      for (const [id, n] of load) if (best === null || n < (load.get(best) ?? 0)) best = id;
      if (best) load.set(best, (load.get(best) ?? 0) + 1);
      return best;
    };

    const created = await this.prisma.$transaction(
      rooms.map((r) =>
        this.prisma.housekeepingTask.create({
          data: {
            hotelId,
            roomId: r.id,
            type: r.status === 'OCCUPIED' ? 'STAYOVER' : 'CHECKOUT_CLEAN',
            priority: r.status === 'RESERVED' ? 'URGENT' : r.status === 'OCCUPIED' ? 'NORMAL' : 'HIGH',
            assigneeId: pickAssignee(),
            notes: 'Auto-generated',
          },
          include: taskInclude,
        }),
      ),
    );

    for (const t of created) this.publish(hotelId, t);
    await Promise.all(rooms.map((r) => this.rooms.broadcast(hotelId, r.id)));
    return { created: created.length };
  }
}
