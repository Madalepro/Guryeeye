'use client';

import {
  CLEANLINESS_LABELS,
  formatMoney,
  hasCapability,
  HousekeepingTaskType,
  ROOM_STATUS_LABELS,
  TASK_TYPE_LABELS,
  TaskPriority,
  type Cleanliness,
  type FolioDto,
  type RoomDto,
  type RoomStatus,
  type UpdateRoomStatusRequest,
} from '@guryeeye/shared';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/toast';
import { Badge, Button, Drawer } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CLEANLINESS_STYLE, ROOM_STATUS_STYLE } from '@/lib/status';

const MANUAL_STATUSES: RoomStatus[] = ['AVAILABLE', 'OUT_OF_ORDER', 'MAINTENANCE'];
const MANUAL_CLEANLINESS: Cleanliness[] = ['DIRTY', 'CLEAN', 'INSPECTED'];

export function RoomDrawer({
  hotelId,
  currency,
  room,
  onClose,
  onChanged,
}: {
  hotelId: string;
  currency: string;
  room: RoomDto | null;
  onClose: () => void;
  onChanged: (room?: RoomDto) => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [folio, setFolio] = useState<FolioDto | null>(null);
  const [taskType, setTaskType] = useState<HousekeepingTaskType>('DEEP_CLEAN');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('NORMAL');

  useEffect(() => {
    setNotes(room?.notes ?? '');
    setFolio(null);
  }, [room?.id, room?.notes]);

  if (!room) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;

  const role = user!.role;
  const canManage = hasCapability(role, 'manageRooms');
  const canClean = hasCapability(role, 'housekeeping');
  const canFrontDesk = hasCapability(role, 'frontDesk');
  const stay = room.currentStay;

  async function run(key: string, fn: () => Promise<unknown>, success: string) {
    setBusy(key);
    try {
      const result = await fn();
      toast(success);
      onChanged(result && typeof result === 'object' && 'floor' in result ? (result as RoomDto) : undefined);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setBusy(null);
    }
  }

  const update = (key: string, body: UpdateRoomStatusRequest, msg: string) =>
    run(key, () => api.rooms.updateStatus(hotelId, room.id, body), msg);

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-3">
          Room {room.number}
          <Badge className={clsx('ring-1 ring-inset', ROOM_STATUS_STYLE[room.status].chip)}>{ROOM_STATUS_LABELS[room.status]}</Badge>
        </span>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <div>
            <p className="font-medium">{room.roomType.name}</p>
            <p className="text-xs text-ink-subtle">
              Floor {room.floor} · {room.roomType.code}
            </p>
          </div>
          <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold', CLEANLINESS_STYLE[room.cleanliness])}>
            {CLEANLINESS_LABELS[room.cleanliness]}
          </span>
        </div>

        <section>
          <h4 className="label">Current stay</h4>
          {stay ? (
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-medium">{stay.guestName}</p>
              <p className="mt-0.5 text-xs text-ink-subtle">
                {stay.checkIn} → {stay.checkOut} · {stay.status === 'CHECKED_IN' ? 'In house' : 'Arriving today'}
              </p>
              {canFrontDesk && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {stay.status === 'CONFIRMED' && (
                    <Button size="sm" loading={busy === 'in'} onClick={() => run('in', () => api.reservations.checkIn(hotelId, stay.reservationId), `${stay.guestName} checked in`)}>
                      Check in
                    </Button>
                  )}
                  {stay.status === 'CHECKED_IN' && (
                    <Button
                      size="sm"
                      loading={busy === 'out'}
                      onClick={() => run('out', () => api.reservations.checkOut(hotelId, stay.reservationId), 'Checked out — cleaning task created')}
                    >
                      Check out
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === 'folio'}
                    onClick={async () => {
                      setBusy('folio');
                      try {
                        setFolio(await api.reservations.folio(hotelId, stay.reservationId));
                      } catch (err) {
                        toast(err instanceof Error ? err.message : 'Could not load folio', 'error');
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    View folio
                  </Button>
                </div>
              )}
              {folio && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  {folio.lines.length === 0 && <p className="text-xs text-ink-subtle">No charges yet.</p>}
                  {folio.lines.map((l) => (
                    <div key={l.id} className="flex justify-between gap-3 py-1 text-xs">
                      <span className="text-ink-muted">{l.description}</span>
                      <span className="tabular-nums">{formatMoney(l.amountCents, currency)}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold">
                    <span>Balance</span>
                    <span className="tabular-nums">{formatMoney(folio.totalCents, currency)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-ink-subtle">No guest assigned for tonight.</p>
          )}
        </section>

        {canManage && (
          <section>
            <h4 className="label">Room status</h4>
            <div className="grid grid-cols-3 gap-2">
              {MANUAL_STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={!!busy || room.status === s || room.status === 'OCCUPIED'}
                  onClick={() => update(`s-${s}`, { status: s }, `Room ${room.number} set to ${ROOM_STATUS_LABELS[s].toLowerCase()}`)}
                  className={clsx(
                    'rounded-lg border px-2 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
                    room.status === s ? ROOM_STATUS_STYLE[s].chip + ' border-transparent' : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <span className={clsx('mr-1.5 inline-block h-2 w-2 rounded-full', ROOM_STATUS_STYLE[s].dot)} />
                  {ROOM_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            {room.status === 'OCCUPIED' && <p className="mt-2 text-xs text-ink-subtle">Check the guest out to change status.</p>}
          </section>
        )}

        {canClean && (
          <section>
            <h4 className="label">Housekeeping status</h4>
            <div className="grid grid-cols-3 gap-2">
              {MANUAL_CLEANLINESS.filter((c) => c !== 'INSPECTED' || hasCapability(role, 'verifyHousekeeping')).map((c) => (
                <button
                  key={c}
                  disabled={!!busy || room.cleanliness === c}
                  onClick={() => update(`c-${c}`, { cleanliness: c }, `Room ${room.number} marked ${CLEANLINESS_LABELS[c].toLowerCase()}`)}
                  className={clsx(
                    'rounded-lg border px-2 py-2 text-xs font-medium transition disabled:cursor-not-allowed',
                    room.cleanliness === c ? CLEANLINESS_STYLE[c] + ' border-transparent' : 'border-slate-200 hover:bg-slate-50 disabled:opacity-40',
                  )}
                >
                  {CLEANLINESS_LABELS[c]}
                </button>
              ))}
            </div>
          </section>
        )}

        {canFrontDesk && (
          <section>
            <h4 className="label">Create housekeeping task</h4>
            <div className="flex gap-2">
              <select name="taskType" aria-label="Task type" className="input" value={taskType} onChange={(e) => setTaskType(e.target.value as HousekeepingTaskType)}>
                {Object.values(HousekeepingTaskType).map((t) => (
                  <option key={t} value={t}>
                    {TASK_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <select name="taskPriority" aria-label="Task priority" className="input w-32" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}>
                {Object.values(TaskPriority).map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="mt-2 w-full"
              variant="secondary"
              loading={busy === 'task'}
              onClick={() =>
                run('task', () => api.housekeeping.create(hotelId, { roomId: room.id, type: taskType, priority: taskPriority }), `${TASK_TYPE_LABELS[taskType]} task created`)
              }
            >
              Create task
            </Button>
            {room.openTaskCount > 0 && <p className="mt-2 text-xs text-ink-subtle">{room.openTaskCount} open task(s) already on this room.</p>}
          </section>
        )}

        {canManage && (
          <section>
            <h4 className="label">Notes</h4>
            <textarea name="roomNotes" aria-label="Room notes" className="input min-h-20" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Extra pillows requested" />
            <Button size="sm" variant="secondary" className="mt-2" disabled={(room.notes ?? '') === notes} loading={busy === 'notes'} onClick={() => update('notes', { notes }, 'Notes saved')}>
              Save notes
            </Button>
          </section>
        )}

        {!canManage && !canClean && !canFrontDesk && (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-ink-subtle">
            Your role has read-only access to rooms. Ask a manager to change a room&apos;s status or raise a housekeeping
            task.
          </p>
        )}
      </div>
    </Drawer>
  );
}
