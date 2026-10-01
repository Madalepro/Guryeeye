/**
 * Domain enums. Values must stay identical to the Prisma enums in
 * apps/backend/prisma/schema.prisma — the backend has a compile-time check
 * (src/common/enum-parity.ts) that fails the build if they drift.
 */

export const UserRole = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  HOTEL_OWNER: 'HOTEL_OWNER',
  MANAGER: 'MANAGER',
  FRONT_DESK: 'FRONT_DESK',
  HOUSEKEEPER: 'HOUSEKEEPER',
  POS_CASHIER: 'POS_CASHIER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const RoomStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  OUT_OF_ORDER: 'OUT_OF_ORDER',
  MAINTENANCE: 'MAINTENANCE',
} as const;
export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus];

export const Cleanliness = {
  CLEAN: 'CLEAN',
  DIRTY: 'DIRTY',
  CLEANING: 'CLEANING',
  INSPECTED: 'INSPECTED',
} as const;
export type Cleanliness = (typeof Cleanliness)[keyof typeof Cleanliness];

export const ReservationStatus = {
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];

export const HousekeepingTaskType = {
  CHECKOUT_CLEAN: 'CHECKOUT_CLEAN',
  STAYOVER: 'STAYOVER',
  DEEP_CLEAN: 'DEEP_CLEAN',
  INSPECTION: 'INSPECTION',
  TURNDOWN: 'TURNDOWN',
  MAINTENANCE: 'MAINTENANCE',
} as const;
export type HousekeepingTaskType = (typeof HousekeepingTaskType)[keyof typeof HousekeepingTaskType];

export const HousekeepingTaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  VERIFIED: 'VERIFIED',
} as const;
export type HousekeepingTaskStatus =
  (typeof HousekeepingTaskStatus)[keyof typeof HousekeepingTaskStatus];

export const TaskPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const PosOutletType = {
  RESTAURANT: 'RESTAURANT',
  BAR: 'BAR',
  ROOM_SERVICE: 'ROOM_SERVICE',
  SPA: 'SPA',
  MINIBAR: 'MINIBAR',
} as const;
export type PosOutletType = (typeof PosOutletType)[keyof typeof PosOutletType];

export const PosOrderStatus = {
  OPEN: 'OPEN',
  PAID: 'PAID',
  CHARGED_TO_ROOM: 'CHARGED_TO_ROOM',
  VOID: 'VOID',
} as const;
export type PosOrderStatus = (typeof PosOrderStatus)[keyof typeof PosOrderStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  MOBILE_MONEY: 'MOBILE_MONEY',
  ROOM_CHARGE: 'ROOM_CHARGE',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  OUT_OF_ORDER: 'Out of order',
  MAINTENANCE: 'Maintenance',
};

export const CLEANLINESS_LABELS: Record<Cleanliness, string> = {
  CLEAN: 'Clean',
  DIRTY: 'Dirty',
  CLEANING: 'Cleaning',
  INSPECTED: 'Inspected',
};

export const TASK_TYPE_LABELS: Record<HousekeepingTaskType, string> = {
  CHECKOUT_CLEAN: 'Checkout clean',
  STAYOVER: 'Stayover',
  DEEP_CLEAN: 'Deep clean',
  INSPECTION: 'Inspection',
  TURNDOWN: 'Turndown',
  MAINTENANCE: 'Maintenance',
};

export const TASK_STATUS_LABELS: Record<HousekeepingTaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  VERIFIED: 'Verified',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  MOBILE_MONEY: 'Mobile money',
  ROOM_CHARGE: 'Charge to room',
};

/** Allowed housekeeping status transitions (state machine enforced by the API). */
export const TASK_TRANSITIONS: Record<HousekeepingTaskStatus, HousekeepingTaskStatus[]> = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['PENDING', 'DONE'],
  DONE: ['IN_PROGRESS', 'VERIFIED'],
  VERIFIED: [],
};

export function canTransitionTask(
  from: HousekeepingTaskStatus,
  to: HousekeepingTaskStatus,
): boolean {
  return TASK_TRANSITIONS[from].includes(to);
}

/** Roles allowed to operate inside a hotel workspace, by capability. */
export const ROLE_CAPABILITIES = {
  manageRooms: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER', 'FRONT_DESK'],
  frontDesk: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER', 'FRONT_DESK'],
  housekeeping: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPER'],
  verifyHousekeeping: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER'],
  pos: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER', 'FRONT_DESK', 'POS_CASHIER'],
  reports: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER'],
} as const satisfies Record<string, readonly UserRole[]>;

export type Capability = keyof typeof ROLE_CAPABILITIES;

export function hasCapability(role: UserRole, capability: Capability): boolean {
  return (ROLE_CAPABILITIES[capability] as readonly UserRole[]).includes(role);
}
