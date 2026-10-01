'use client';

import {
  formatMoney,
  MAINTENANCE_STATUS_LABELS,
  MaintenanceStatus,
  TaskPriority,
  type MaintenanceRequestDto,
} from '@guryeeye/shared';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, EmptyState, ErrorBanner, Modal, PageHeader, Segmented, Spinner, Stat } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { useHotel } from '@/lib/hotel';
import { PRIORITY_STYLE } from '@/lib/status';
import { useAsync } from '@/lib/use-async';

type Filter = 'open' | 'RESOLVED';

function NewRequestModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { hotel } = useHotel();
  const toast = useToast();
  const properties = useAsync(() => api.rentals.properties(hotel!.id), [hotel!.id]);
  const [form, setForm] = useState({ unitId: '', title: '', description: '', priority: 'NORMAL' as TaskPriority, blockUnit: false });
  const [saving, setSaving] = useState(false);
  const unit = properties.data?.flatMap((p) => p.units).find((u) => u.id === form.unitId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.rpm.createMaintenance(hotel!.id, {
        unitId: form.unitId,
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        blockUnit: form.blockUnit && unit?.status === 'VACANT',
      });
      toast('Maintenance request logged');
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not log request', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Log a maintenance request">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="mUnit">Unit</label>
          <select id="mUnit" name="mUnit" className="input" required value={form.unitId} onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))}>
            <option value="">Choose a unit…</option>
            {properties.data?.map((p) => (
              <optgroup key={p.id} label={p.name}>
                {p.units.map((u) => (
                  <option key={u.id} value={u.id}>{u.label}{u.tenant ? ` — ${u.tenant.name}` : ` (${u.status.toLowerCase()})`}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="mTitle">What needs fixing?</label>
          <input id="mTitle" name="mTitle" className="input" required minLength={2} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Leaking kitchen tap" />
        </div>
        <div>
          <label className="label" htmlFor="mDesc">Details</label>
          <textarea id="mDesc" name="mDesc" rows={2} className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="mPriority">Priority</label>
          <select id="mPriority" name="mPriority" className="input" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}>
            {Object.values(TaskPriority).map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
        {unit?.status === 'VACANT' && (
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" name="mBlock" checked={form.blockUnit} onChange={(e) => setForm((f) => ({ ...f, blockUnit: e.target.checked }))} />
            Take this vacant unit off the market until the work is done
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Log request</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function MaintenancePage() {
  const { hotel } = useHotel();
  const hotelId = hotel!.id;
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('open');
  const { data, error, loading, reload, setData } = useAsync(() => api.rpm.maintenance(hotelId), [hotelId]);
  const [adding, setAdding] = useState(false);
  const [resolving, setResolving] = useState<MaintenanceRequestDto | null>(null);
  const [cost, setCost] = useState('');
  const money = (c: number) => formatMoney(c, hotel!.currency);

  async function update(m: MaintenanceRequestDto, body: Parameters<typeof api.rpm.updateMaintenance>[2]) {
    try {
      const updated = await api.rpm.updateMaintenance(hotelId, m.id, body);
      setData((rows) => rows?.map((r) => (r.id === updated.id ? updated : r)));
      if (body.status) toast(`${m.title} — ${MAINTENANCE_STATUS_LABELS[body.status].toLowerCase()}`);
      return true;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update request', 'error');
      return false;
    }
  }

  const rows = data ?? [];
  const open = rows.filter((r) => r.status !== 'RESOLVED');
  const shown = filter === 'open' ? open : rows.filter((r) => r.status === 'RESOLVED');
  const spent = rows.filter((r) => r.status === 'RESOLVED').reduce((s, r) => s + (r.costCents ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Maintenance"
        subtitle="Property management (RPM) — repairs across every unit, from report to resolution"
        actions={
          <>
            <Segmented<Filter> value={filter} onChange={setFilter} options={[{ value: 'open', label: `Open (${open.length})` }, { value: 'RESOLVED', label: 'Resolved' }]} />
            <Button onClick={() => setAdding(true)}>Log request</Button>
          </>
        }
      />
      <ErrorBanner error={error} onRetry={reload} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat tone="brand" label="Open requests" value={open.length} hint={`${open.filter((r) => r.priority === 'URGENT' || r.priority === 'HIGH').length} high priority`} />
        <Stat label="In progress" value={open.filter((r) => r.status === 'IN_PROGRESS').length} />
        <Stat tone="sand" label="Spent on repairs" value={money(spent)} hint="Resolved requests with a cost recorded" />
      </div>

      <Card>
        {loading && !data ? (
          <div className="flex justify-center py-16 text-brand-700"><Spinner /></div>
        ) : shown.length === 0 ? (
          <div className="p-5"><EmptyState title={filter === 'open' ? 'Nothing waiting — every unit is in good shape' : 'No resolved requests yet'} /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {shown.map((m) => (
              <div key={m.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{m.title}</p>
                    <Badge className={PRIORITY_STYLE[m.priority]}>{m.priority.toLowerCase()}</Badge>
                    {m.unit.status === 'MAINTENANCE' && <Badge className="bg-violet-50 text-violet-700 ring-violet-600/20">Off market</Badge>}
                  </div>
                  <p className="text-xs text-ink-subtle">
                    {m.property.name} · {m.unit.label}{m.tenantName ? ` · ${m.tenantName}` : ''} · reported {new Date(m.createdAt).toLocaleDateString()}
                  </p>
                  {m.description && <p className="mt-1 text-sm text-ink-muted">{m.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {m.status === 'RESOLVED' ? (
                    <span className="text-sm text-ink-muted">
                      Resolved {m.resolvedAt ? new Date(m.resolvedAt).toLocaleDateString() : ''}{m.costCents !== null ? ` · ${money(m.costCents)}` : ''}
                    </span>
                  ) : (
                    <>
                      {m.status === 'OPEN' && <Button size="sm" variant="secondary" onClick={() => update(m, { status: 'IN_PROGRESS' })}>Start work</Button>}
                      <Button size="sm" onClick={() => { setResolving(m); setCost(m.costCents !== null ? String(m.costCents / 100) : ''); }}>Mark resolved</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {adding && <NewRequestModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); void reload(); }} />}
      <Modal open={!!resolving} onClose={() => setResolving(null)} title="Resolve request">
        {resolving && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await update(resolving, { status: MaintenanceStatus.RESOLVED, costCents: cost ? Math.round(Number(cost) * 100) : null });
              if (ok) {
                setResolving(null);
                void reload();
              }
            }}
            className="space-y-4"
          >
            <p className="text-sm text-ink-muted">{resolving.title} · {resolving.property.name} {resolving.unit.label}</p>
            <div>
              <label className="label" htmlFor="mCost">Repair cost ({hotel!.currency}, optional)</label>
              <input id="mCost" name="mCost" type="number" min={0} step="0.01" className="input" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setResolving(null)}>Cancel</Button>
              <Button type="submit">Mark resolved</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
