'use client';

import {
  computeOrderTotals,
  formatMoney,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  type PosItemDto,
  type PosOrderDto,
} from '@guryeeye/shared';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/toast';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBanner, Modal, PageHeader, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useHotel, useHotelEvents } from '@/lib/hotel';
import { useAsync } from '@/lib/use-async';

interface CartLine {
  item: PosItemDto;
  quantity: number;
}

const STATUS_BADGE: Record<PosOrderDto['status'], string> = {
  OPEN: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  PAID: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CHARGED_TO_ROOM: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  VOID: 'bg-slate-100 text-slate-500 ring-slate-500/20',
};

export default function PosPage() {
  const { hotel } = useHotel();
  const toast = useToast();
  const hotelId = hotel!.id;
  const currency = hotel!.currency;
  const money = (c: number) => formatMoney(c, currency);

  const outlets = useAsync(() => api.pos.outlets(hotelId), [hotelId]);
  const orders = useAsync(() => api.pos.orders(hotelId), [hotelId]);
  const rooms = useAsync(() => api.rooms.list(hotelId), [hotelId]);

  const [outletId, setOutletId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paying, setPaying] = useState<PosOrderDto | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!outletId && outlets.data?.[0]) setOutletId(outlets.data[0].id);
  }, [outlets.data, outletId]);

  useHotelEvents((e) => {
    if (e.type === 'order.updated') {
      orders.setData((list) => {
        if (!list) return list;
        const exists = list.some((o) => o.id === e.order.id);
        return exists ? list.map((o) => (o.id === e.order.id ? e.order : o)) : [e.order, ...list];
      });
    }
    if (e.type === 'room.updated') rooms.setData((list) => list?.map((r) => (r.id === e.room.id ? e.room : r)));
  });

  const outlet = outlets.data?.find((o) => o.id === outletId) ?? null;
  const categories = useMemo(() => [...new Set(outlet?.items.map((i) => i.category) ?? [])], [outlet]);
  const items = outlet?.items.filter((i) => category === 'ALL' || i.category === category) ?? [];
  const totals = computeOrderTotals(cart.map((l) => ({ quantity: l.quantity, unitPriceCents: l.item.priceCents })), hotel!.taxRateBps);
  const inHouse = (rooms.data ?? []).filter((r) => r.currentStay?.status === 'CHECKED_IN');

  const add = (item: PosItemDto) =>
    setCart((c) => {
      const found = c.find((l) => l.item.id === item.id);
      return found ? c.map((l) => (l.item.id === item.id ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l)) : [...c, { item, quantity: 1 }];
    });
  const setQty = (id: string, q: number) => setCart((c) => (q <= 0 ? c.filter((l) => l.item.id !== id) : c.map((l) => (l.item.id === id ? { ...l, quantity: Math.min(99, q) } : l))));

  async function submit(thenPay: boolean) {
    if (!outlet || cart.length === 0) return;
    setBusy('submit');
    try {
      const order = await api.pos.createOrder(hotelId, {
        outletId: outlet.id,
        lines: cart.map((l) => ({ itemId: l.item.id, quantity: l.quantity })),
      });
      setCart([]);
      toast(`Order #${order.number} sent`);
      if (thenPay) setPaying(order);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create order', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function voidOrder(o: PosOrderDto) {
    if (!window.confirm(`Void order #${o.number}?`)) return;
    setBusy(o.id);
    try {
      await api.pos.void(hotelId, o.id);
      toast(`Order #${o.number} voided`, 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not void order', 'error');
    } finally {
      setBusy(null);
    }
  }

  const openOrders = (orders.data ?? []).filter((o) => o.status === 'OPEN');
  const recent = (orders.data ?? []).filter((o) => o.status !== 'OPEN').slice(0, 12);

  return (
    <>
      <PageHeader title="Point of sale" subtitle="Ring up restaurant, bar, spa and room-service sales — settle now or post to a guest folio." />
      <ErrorBanner error={outlets.error} onRetry={outlets.reload} />

      {outlets.loading && !outlets.data ? (
        <div className="flex justify-center py-24 text-brand-700">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {outlets.data?.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setOutletId(o.id);
                    setCategory('ALL');
                    setCart([]);
                  }}
                  className={clsx(
                    'whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition',
                    o.id === outletId ? 'bg-brand-700 text-white shadow-sm' : 'bg-white text-ink-muted ring-1 ring-slate-200 hover:text-ink',
                  )}
                >
                  {o.name}
                </button>
              ))}
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {['ALL', ...categories].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={clsx(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    c === category ? 'bg-sand-500 text-white' : 'bg-white text-ink-muted ring-1 ring-slate-200 hover:text-ink',
                  )}
                >
                  {c === 'ALL' ? 'All items' : c}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {items.map((i) => {
                const inCart = cart.find((l) => l.item.id === i.id)?.quantity;
                return (
                  <button
                    key={i.id}
                    onClick={() => add(i)}
                    className="relative flex min-h-[96px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-card active:translate-y-0"
                  >
                    {inCart && (
                      <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-700 px-1.5 text-xs font-bold text-white">
                        {inCart}
                      </span>
                    )}
                    <span className="text-sm font-medium leading-snug">{i.name}</span>
                    <span className="mt-2 font-display text-sm font-semibold text-brand-800 tabular-nums">{money(i.priceCents)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Current ticket" subtitle={outlet?.name} action={cart.length > 0 && <Button size="sm" variant="ghost" onClick={() => setCart([])}>Clear</Button>} />
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto scrollbar-thin">
                {cart.length === 0 && <div className="p-5"><EmptyState title="Ticket is empty" description="Tap items to add them." /></div>}
                {cart.map((l) => (
                  <div key={l.item.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.item.name}</p>
                      <p className="text-xs text-ink-subtle tabular-nums">{money(l.item.priceCents)}</p>
                    </div>
                    <div className="flex items-center rounded-lg ring-1 ring-slate-200">
                      <button className="px-2 py-1 text-ink-muted hover:text-ink" onClick={() => setQty(l.item.id, l.quantity - 1)} aria-label={`Decrease ${l.item.name}`}>−</button>
                      <span className="w-6 text-center text-sm tabular-nums">{l.quantity}</span>
                      <button className="px-2 py-1 text-ink-muted hover:text-ink" onClick={() => setQty(l.item.id, l.quantity + 1)} aria-label={`Increase ${l.item.name}`}>+</button>
                    </div>
                    <span className="w-20 text-right text-sm font-medium tabular-nums">{money(l.item.priceCents * l.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 border-t border-slate-100 px-5 py-4 text-sm">
                <div className="flex justify-between text-ink-muted"><span>Subtotal</span><span className="tabular-nums">{money(totals.subtotalCents)}</span></div>
                <div className="flex justify-between text-ink-muted"><span>Tax ({(hotel!.taxRateBps / 100).toFixed(2)}%)</span><span className="tabular-nums">{money(totals.taxCents)}</span></div>
                <div className="flex justify-between pt-1 font-display text-lg font-semibold"><span>Total</span><span className="tabular-nums">{money(totals.totalCents)}</span></div>
                <div className="grid grid-cols-2 gap-2 pt-3">
                  <Button variant="secondary" disabled={cart.length === 0} loading={busy === 'submit'} onClick={() => submit(false)}>Hold ticket</Button>
                  <Button disabled={cart.length === 0} loading={busy === 'submit'} onClick={() => submit(true)}>Charge</Button>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Open tickets" subtitle={`${openOrders.length} awaiting payment`} />
              <div className="divide-y divide-slate-100">
                {openOrders.length === 0 && <p className="px-5 py-4 text-xs text-ink-subtle">No open tickets.</p>}
                {openOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">#{o.number} · {o.outlet.name}</p>
                      <p className="text-xs text-ink-subtle">{o.lines.reduce((s, l) => s + l.quantity, 0)} items · {money(o.totalCents)}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" loading={busy === o.id} onClick={() => voidOrder(o)}>Void</Button>
                      <Button size="sm" onClick={() => setPaying(o)}>Pay</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Recent sales" />
              <div className="divide-y divide-slate-100">
                {recent.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <div>
                      <span className="font-medium">#{o.number}</span>{' '}
                      <span className="text-xs text-ink-subtle">{o.outlet.name}{o.roomNumber ? ` → Room ${o.roomNumber}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_BADGE[o.status]}>{o.paymentMethod ? PAYMENT_METHOD_LABELS[o.paymentMethod] : o.status.toLowerCase()}</Badge>
                      <span className="w-20 text-right tabular-nums">{money(o.totalCents)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      <PaymentModal
        order={paying}
        currency={currency}
        inHouse={inHouse.map((r) => ({ reservationId: r.currentStay!.reservationId, label: `Room ${r.number} — ${r.currentStay!.guestName}` }))}
        onClose={() => setPaying(null)}
        onPay={async (method, reservationId) => {
          if (!paying) return;
          try {
            const o = await api.pos.pay(hotelId, paying.id, { method, reservationId });
            toast(o.status === 'CHARGED_TO_ROOM' ? `#${o.number} posted to room ${o.roomNumber}` : `#${o.number} paid — ${PAYMENT_METHOD_LABELS[method]}`);
            setPaying(null);
          } catch (err) {
            toast(err instanceof Error ? err.message : 'Payment failed', 'error');
          }
        }}
      />
    </>
  );
}

function PaymentModal({
  order,
  currency,
  inHouse,
  onClose,
  onPay,
}: {
  order: PosOrderDto | null;
  currency: string;
  inHouse: { reservationId: string; label: string }[];
  onClose: () => void;
  onPay: (method: PaymentMethod, reservationId?: string) => Promise<void>;
}) {
  const [method, setMethod] = useState<PaymentMethod>('CARD');
  const [reservationId, setReservationId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMethod('CARD');
    setReservationId('');
  }, [order?.id]);

  if (!order) return null;
  const needsRoom = method === 'ROOM_CHARGE';

  return (
    <Modal open onClose={onClose} title={`Settle order #${order.number}`}>
      <p className="mb-4 font-display text-3xl font-semibold tabular-nums">{formatMoney(order.totalCents, currency)}</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.values(PaymentMethod).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={clsx(
              'rounded-xl border-2 px-3 py-3 text-sm font-medium transition',
              m === method ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 hover:border-slate-300',
            )}
          >
            {PAYMENT_METHOD_LABELS[m]}
          </button>
        ))}
      </div>
      {needsRoom && (
        <div className="mt-4">
          <label className="label" htmlFor="guest">In-house guest</label>
          <select id="guest" className="input" value={reservationId} onChange={(e) => setReservationId(e.target.value)}>
            <option value="">Select a room…</option>
            {inHouse.map((g) => (
              <option key={g.reservationId} value={g.reservationId}>{g.label}</option>
            ))}
          </select>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          loading={submitting}
          disabled={needsRoom && !reservationId}
          onClick={async () => {
            setSubmitting(true);
            await onPay(method, needsRoom ? reservationId : undefined);
            setSubmitting(false);
          }}
        >
          {needsRoom ? 'Post to folio' : 'Take payment'}
        </Button>
      </div>
    </Modal>
  );
}
