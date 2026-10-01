import type * as Db from '@prisma/client';
import type * as Shared from '@guryeeye/shared';

/**
 * Compile-time guard: if a Prisma enum and its shared counterpart ever drift,
 * `tsc` fails here instead of the bug surfacing at runtime in a client.
 */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

export type EnumParity = [
  Assert<Same<Db.UserRole, Shared.UserRole>>,
  Assert<Same<Db.RoomStatus, Shared.RoomStatus>>,
  Assert<Same<Db.Cleanliness, Shared.Cleanliness>>,
  Assert<Same<Db.ReservationStatus, Shared.ReservationStatus>>,
  Assert<Same<Db.HousekeepingTaskType, Shared.HousekeepingTaskType>>,
  Assert<Same<Db.HousekeepingTaskStatus, Shared.HousekeepingTaskStatus>>,
  Assert<Same<Db.TaskPriority, Shared.TaskPriority>>,
  Assert<Same<Db.PosOutletType, Shared.PosOutletType>>,
  Assert<Same<Db.PosOrderStatus, Shared.PosOrderStatus>>,
  Assert<Same<Db.PaymentMethod, Shared.PaymentMethod>>,
];
