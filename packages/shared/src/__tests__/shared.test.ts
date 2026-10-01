import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  addDays,
  canTransitionTask,
  computeOrderTotals,
  computeTaxCents,
  eachDay,
  hasCapability,
  isIsoDate,
  nightsBetween,
} from '../index';

describe('money', () => {
  it('computes tax in basis points with rounding', () => {
    assert.equal(computeTaxCents(1000, 1500), 150);
    assert.equal(computeTaxCents(333, 1500), 50);
    assert.equal(computeTaxCents(0, 1500), 0);
  });

  it('computes order totals', () => {
    const totals = computeOrderTotals(
      [
        { quantity: 2, unitPriceCents: 450 },
        { quantity: 1, unitPriceCents: 1200 },
      ],
      1000,
    );
    assert.deepEqual(totals, { subtotalCents: 2100, taxCents: 210, totalCents: 2310 });
  });
});

describe('dates', () => {
  it('validates ISO dates strictly', () => {
    assert.equal(isIsoDate('2026-02-28'), true);
    assert.equal(isIsoDate('2026-02-30'), false);
    assert.equal(isIsoDate('2026-2-3'), false);
  });

  it('iterates days inclusively across month boundaries', () => {
    assert.deepEqual(eachDay('2026-01-30', '2026-02-02'), [
      '2026-01-30',
      '2026-01-31',
      '2026-02-01',
      '2026-02-02',
    ]);
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(nightsBetween('2026-03-01', '2026-03-04'), 3);
  });
});

describe('housekeeping state machine', () => {
  it('allows only defined transitions', () => {
    assert.equal(canTransitionTask('PENDING', 'IN_PROGRESS'), true);
    assert.equal(canTransitionTask('PENDING', 'VERIFIED'), false);
    assert.equal(canTransitionTask('DONE', 'VERIFIED'), true);
    assert.equal(canTransitionTask('VERIFIED', 'PENDING'), false);
  });
});

describe('capabilities', () => {
  it('restricts reports to management roles', () => {
    assert.equal(hasCapability('HOTEL_OWNER', 'reports'), true);
    assert.equal(hasCapability('HOUSEKEEPER', 'reports'), false);
    assert.equal(hasCapability('HOUSEKEEPER', 'housekeeping'), true);
  });
});
