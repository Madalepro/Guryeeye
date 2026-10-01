'use client';

import {
  hasCapability,
  HousekeepingTaskStatus,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  type HousekeepingTaskDto,
  type UpdateHousekeepingTaskRequest,
} from '@guryeeye/shared';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { IconSparkle } from '@/components/icons';
import { useToast } from '@/components/toast';
import { Badge, Button, Card, CardHeader, ErrorBanner, PageHeader, Spinner, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useHotel, useHotelEvents } from '@/lib/hotel';
import { PRIORITY_STYLE, TASK_STATUS_STYLE } from '@/lib/status';
import { useAsync } from '@/lib/use-async';

const COLUMNS = Object.values(HousekeepingTaskStatus);

function minutesSince(iso: string | null): number | null {
  return iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000)) : null;
}

export default function HousekeepingPage() {
  const { hotel } = useHotel();
  const { user } = useAuth();
  const toast = useToast();
  const hotelId = hotel!.id;
  const tasks = useAsync(() => api.housekeeping.tasks(hotelId), [hotelId]);
  const staff = useAsync(() => api.housekeeping.staff(hotelId), [hotelId]);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(user!.role === 'HOUSEKEEPER' ? 'MINE' : 'ALL');
  const [busy, setBusy] = useState<string | null>(null);

  const canSupervise = hasCapability(user!.role, 'verifyHousekeeping');
  const isHousekeeper = user!.role === 'HOUSEKEEPER';

  useHotelEvents((e) => {
    if (e.type === 'task.updated') {
      tasks.setData((list) => {
        if (!list) return list;
        const idx = list.findIndex((t) => t.id === e.task.id);
        if (idx === -1) return [e.task, ...list];
        const next = [...list];
        next[idx] = e.task;
        return next;
      });
      void staff.reload();
    }
  });

  async function update(task: HousekeepingTaskDto, body: UpdateHousekeepingTaskRequest, msg?: string) {
    setBusy(task.id);
    try {
      const updated = await api.housekeeping.update(hotelId, task.id, body);
      tasks.setData((list) => list?.map((t) => (t.id === updated.id ? updated : t)));
      if (msg) toast(msg);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function autoGenerate() {
    setBusy('auto');
    try {
      const { created } = await api.housekeeping.autoGenerate(hotelId);
      toast(created ? `Created and assigned ${created} task${created === 1 ? '' : 's'}` : 'Every dirty room already has a task', created ? 'success' : 'info');
      await Promise.all([tasks.reload(), staff.reload()]);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not generate tasks', 'error');
    } finally {
      setBusy(null);
    }
  }

  const visible = useMemo(
    () =>
      (tasks.data ?? []).filter((t) =>
        assigneeFilter === 'ALL'
          ? true
          : assigneeFilter === 'MINE'
            ? t.assignee?.id === user!.id || (isHousekeeper && !t.assignee)
            : assigneeFilter === 'UNASSIGNED'
              ? !t.assignee
              : t.assignee?.id === assigneeFilter,
      ),
    [tasks.data, assigneeFilter, user, isHousekeeper],
  );

  const all = tasks.data ?? [];
  const count = (s: HousekeepingTaskStatus) => all.filter((t) => t.status === s).length;
  const urgent = all.filter((t) => (t.status === 'PENDING' || t.status === 'IN_PROGRESS') && t.priority === 'URGENT').length;

  return (
    <>
      <PageHeader
        title="Housekeeping"
        subtitle="Dispatch, track and inspect room cleaning in real time."
        actions={
          canSupervise && (
            <Button variant="accent" onClick={autoGenerate} loading={busy === 'auto'}>
              <IconSparkle className="h-4 w-4" />
              Auto-assign dirty rooms
            </Button>
          )
        }
      />
      <ErrorBanner error={tasks.error} onRetry={tasks.reload} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="To do" value={count('PENDING')} hint={urgent ? `${urgent} urgent` : 'No urgent tasks'} />
        <Stat label="In progress" value={count('IN_PROGRESS')} />
        <Stat label="Awaiting inspection" value={count('DONE')} />
        <Stat tone="brand" label="Inspected (24h)" value={count('VERIFIED')} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <label className="text-xs font-medium text-ink-muted" htmlFor="assignee">
              Showing
            </label>
            <select id="assignee" className="input w-56" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
              <option value="ALL">All tasks</option>
              {isHousekeeper && <option value="MINE">My tasks</option>}
              <option value="UNASSIGNED">Unassigned</option>
              {staff.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {tasks.loading && !tasks.data ? (
            <div className="flex justify-center py-24 text-brand-700">
              <Spinner />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {COLUMNS.map((col) => {
                const list = visible.filter((t) => t.status === col);
                return (
                  <div key={col} className="flex min-h-[200px] flex-col rounded-2xl bg-slate-100/70 p-3">
                    <div className="mb-3 flex items-center justify-between px-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{TASK_STATUS_LABELS[col]}</h3>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-muted">{list.length}</span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {list.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          busy={busy === t.id}
                          canSupervise={canSupervise}
                          isHousekeeper={isHousekeeper}
                          userId={user!.id}
                          staff={staff.data ?? []}
                          onUpdate={(body, msg) => update(t, body, msg)}
                        />
                      ))}
                      {list.length === 0 && <p className="px-1 py-6 text-center text-xs text-ink-subtle">Nothing here</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader title="Team workload" subtitle="Open tasks per person" />
          <div className="space-y-3 p-5">
            {staff.data?.map((s) => {
              const max = Math.max(1, ...staff.data!.map((x) => x.openTasks));
              return (
                <div key={s.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="tabular-nums text-ink-muted">{s.openTasks}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${(s.openTasks / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {staff.data?.length === 0 && <p className="text-xs text-ink-subtle">No housekeeping staff yet.</p>}
          </div>
        </Card>
      </div>
    </>
  );
}

function TaskCard({
  task,
  busy,
  canSupervise,
  isHousekeeper,
  userId,
  staff,
  onUpdate,
}: {
  task: HousekeepingTaskDto;
  busy: boolean;
  canSupervise: boolean;
  isHousekeeper: boolean;
  userId: string;
  staff: { id: string; name: string }[];
  onUpdate: (body: UpdateHousekeepingTaskRequest, msg?: string) => void;
}) {
  const elapsed = task.status === 'IN_PROGRESS' ? minutesSince(task.startedAt) : null;
  const lockedForMe = isHousekeeper && !!task.assignee && task.assignee.id !== userId;
  const room = `Room ${task.room.number}`;

  return (
    <div className={clsx('rounded-xl border border-t-4 border-slate-200 bg-white p-3 shadow-sm', TASK_STATUS_STYLE[task.status], busy && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-bold">{task.room.number}</p>
          <p className="text-xs text-ink-muted">{TASK_TYPE_LABELS[task.type]}</p>
        </div>
        <Badge className={PRIORITY_STYLE[task.priority]}>{task.priority.toLowerCase()}</Badge>
      </div>
      {task.notes && <p className="mt-2 line-clamp-2 text-xs text-ink-subtle">{task.notes}</p>}
      {elapsed !== null && <p className={clsx('mt-2 text-xs font-medium', elapsed > 45 ? 'text-red-600' : 'text-sky-700')}>{elapsed} min elapsed</p>}

      <div className="mt-3">
        {isHousekeeper ? (
          <p className="text-xs text-ink-muted">{task.assignee ? task.assignee.name : 'Unassigned'}</p>
        ) : (
          <select
            aria-label={`Assignee for room ${task.room.number}`}
            className="input py-1 text-xs"
            disabled={busy || task.status === 'VERIFIED'}
            value={task.assignee?.id ?? ''}
            onChange={(e) => onUpdate({ assigneeId: e.target.value || null }, 'Task reassigned')}
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {!lockedForMe && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.status === 'PENDING' && (
            <Button size="sm" disabled={busy} onClick={() => onUpdate({ status: 'IN_PROGRESS' }, `${room} — cleaning started`)}>
              Start
            </Button>
          )}
          {task.status === 'IN_PROGRESS' && (
            <>
              <Button size="sm" disabled={busy} onClick={() => onUpdate({ status: 'DONE' }, `${room} marked clean`)}>
                Mark done
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onUpdate({ status: 'PENDING' })}>
                Pause
              </Button>
            </>
          )}
          {task.status === 'DONE' && canSupervise && (
            <>
              <Button size="sm" disabled={busy} onClick={() => onUpdate({ status: 'VERIFIED' }, `${room} inspected`)}>
                Inspect &amp; approve
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onUpdate({ status: 'IN_PROGRESS' }, `${room} sent back for re-clean`)}>
                Re-clean
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
