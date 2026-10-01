import { commissionCents } from '../sales/sales.service';
import { billingPeriods, monthStart, nextMonth } from './rentals.service';

describe('rent billing', () => {
  it('rolls months over the year boundary', () => {
    expect(nextMonth('2026-12-01')).toBe('2027-01-01');
    expect(nextMonth('2026-03-01')).toBe('2026-04-01');
    expect(monthStart('2026-02-28')).toBe('2026-02-01');
  });

  it('bills from the first month through the current month', () => {
    expect(billingPeriods('2026-08-15', '2027-08-14', '2026-10-01')).toEqual(['2026-08-01', '2026-09-01', '2026-10-01']);
  });

  it('stops billing after the lease ends', () => {
    expect(billingPeriods('2026-01-01', '2026-02-28', '2026-10-01')).toEqual(['2026-01-01', '2026-02-01']);
  });

  it('bills nothing for a lease that has not started', () => {
    expect(billingPeriods('2026-11-01', '2027-10-31', '2026-10-01')).toEqual([]);
  });
});

describe('sales commission', () => {
  it('applies basis points and rounds to the cent', () => {
    expect(commissionCents(10_000_000, 300)).toBe(300_000);
    expect(commissionCents(12_345, 250)).toBe(309);
  });
});
