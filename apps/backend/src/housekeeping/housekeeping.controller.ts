import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  TaskPriority,
  type AuthUser,
  type AutoGenerateTasksResponse,
  type CreateHousekeepingTaskRequest,
  type HousekeepingTaskDto,
  type StaffMemberDto,
  type UpdateHousekeepingTaskRequest,
} from '@guryeeye/shared';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { CurrentUser, RequireCapability } from '../auth/auth.decorators';
import { HousekeepingService } from './housekeeping.service';

class CreateTaskDto implements CreateHousekeepingTaskRequest {
  @IsString() roomId: string;
  @IsIn(Object.values(HousekeepingTaskType)) type: HousekeepingTaskType;
  @IsOptional() @IsIn(Object.values(TaskPriority)) priority?: TaskPriority;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() assigneeId?: string | null;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsISO8601() dueAt?: string;
}

class UpdateTaskDto implements UpdateHousekeepingTaskRequest {
  @IsOptional() @IsIn(Object.values(HousekeepingTaskStatus)) status?: HousekeepingTaskStatus;
  @IsOptional() @IsIn(Object.values(TaskPriority)) priority?: TaskPriority;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() assigneeId?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(500) notes?: string | null;
}

class ListTasksQuery {
  @IsOptional() @IsIn(Object.values(HousekeepingTaskStatus)) status?: HousekeepingTaskStatus;
}

@RequireCapability('housekeeping')
@Controller('hotels/:hotelId/housekeeping')
export class HousekeepingController {
  constructor(private readonly housekeeping: HousekeepingService) {}

  @Get('tasks')
  list(@Param('hotelId') hotelId: string, @Query() q: ListTasksQuery): Promise<HousekeepingTaskDto[]> {
    return this.housekeeping.list(hotelId, q.status);
  }

  @Get('staff')
  staff(@Param('hotelId') hotelId: string): Promise<StaffMemberDto[]> {
    return this.housekeeping.staff(hotelId);
  }

  @RequireCapability('frontDesk')
  @Post('tasks')
  create(@Param('hotelId') hotelId: string, @Body() body: CreateTaskDto): Promise<HousekeepingTaskDto> {
    return this.housekeeping.create(hotelId, body);
  }

  @Patch('tasks/:taskId')
  update(
    @Param('hotelId') hotelId: string,
    @Param('taskId') taskId: string,
    @Body() body: UpdateTaskDto,
    @CurrentUser() user: AuthUser,
  ): Promise<HousekeepingTaskDto> {
    return this.housekeeping.update(hotelId, taskId, body, user);
  }

  @RequireCapability('verifyHousekeeping')
  @Post('auto-generate')
  autoGenerate(@Param('hotelId') hotelId: string): Promise<AutoGenerateTasksResponse> {
    return this.housekeeping.autoGenerate(hotelId);
  }
}
