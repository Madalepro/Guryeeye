import { averageMinutes, buildOccupancySeries, computeKpis } from './report-calc';

describe('report calculations', () => {
  const stays = [
    { checkIn: '2026-03-01', checkOut: '2026-03-03', rateCents: 10_000 }, // nights 1st, 2nd
    { checkIn: '2026-03-02', checkOut: '2026-03-03', rateCents: 20_000 }, // night 2nd
    { checkIn: '2026-02-25', checkOut: '2026-03-01', rateCents: 5_000 }, // departs 1st: no night in range
  ];

  it('counts a stay on nights checkIn..checkOut-1 only', () => {
    const series = buildOccupancySeries('2026-03-01', '2026-03-03', 4, stays);
    expect(series.map((d) => d.occupiedRooms)).toEqual([1, 2, 0]);
    expect(series.map((d) => d.roomRevenueCents)).toEqual([10_000, 30_000, 0]);
    expect(series[1]?.occupancyRate).toBe(0.5);
  });

  it('computes occupancy, ADR and RevPAR', () => {
    const series = buildOccupancySeries('2026-03-01', '2026-03-03', 4, stays);
    const kpis = computeKpis(series, 2_500);
    expect(kpis.roomNightsSold).toBe(3);
    expect(kpis.occupancyRate).toBeCloseTo(3 / 12);
    expect(kpis.adrCents).toBe(Math.round(40_000 / 3));
    expect(kpis.revparCents).toBe(Math.round(40_000 / 12));
    expect(kpis.totalRevenueCents).toBe(42_500);
  });

  it('handles hotels with no rooms without dividing by zero', () => {
    const kpis = computeKpis(buildOccupancySeries('2026-03-01', '2026-03-01', 0, []), 0);
    expect(kpis).toMatchObject({ occupancyRate: 0, adrCents: 0, revparCents: 0 });
  });

  it('averages only complete, non-negative task durations', () => {
    const t = (iso: string) => new Date(iso);
    expect(
      averageMinutes([
        { startedAt: t('2026-03-01T10:00:00Z'), completedAt: t('2026-03-01T10:30:00Z') },
        { startedAt: t('2026-03-01T11:00:00Z'), completedAt: t('2026-03-01T11:20:00Z') },
        { startedAt: null, completedAt: t('2026-03-01T12:00:00Z') },
      ]),
    ).toBe(25);
    expect(averageMinutes([])).toBeNull();
  });
});
