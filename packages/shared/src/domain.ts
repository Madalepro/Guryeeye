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
  PROPERTY_MANAGER: 'PROPERTY_MANAGER',
  SALES_AGENT: 'SALES_AGENT',
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

export const PropertyType = {
  APARTMENT: 'APARTMENT',
  HOUSE: 'HOUSE',
  VILLA: 'VILLA',
  COMMERCIAL: 'COMMERCIAL',
  LAND: 'LAND',
} as const;
export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export const UnitStatus = {
  VACANT: 'VACANT',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
} as const;
export type UnitStatus = (typeof UnitStatus)[keyof typeof UnitStatus];

export const LeaseStatus = {
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
} as const;
export type LeaseStatus = (typeof LeaseStatus)[keyof typeof LeaseStatus];

export const RentPaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
} as const;
export type RentPaymentStatus = (typeof RentPaymentStatus)[keyof typeof RentPaymentStatus];

export const ListingStatus = {
  ACTIVE: 'ACTIVE',
  UNDER_OFFER: 'UNDER_OFFER',
  SOLD: 'SOLD',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];

export const LeadStage = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  VIEWING: 'VIEWING',
  NEGOTIATION: 'NEGOTIATION',
  WON: 'WON',
  LOST: 'LOST',
} as const;
export type LeadStage = (typeof LeadStage)[keyof typeof LeadStage];

export const MaintenanceStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
} as const;
export type MaintenanceStatus = (typeof MaintenanceStatus)[keyof typeof MaintenanceStatus];

export const ProjectStatus = {
  PLANNING: 'PLANNING',
  UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION',
  COMPLETED: 'COMPLETED',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Off-plan',
  UNDER_CONSTRUCTION: 'Under construction',
  COMPLETED: 'Ready to move in',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: 'Apartment',
  HOUSE: 'House',
  VILLA: 'Villa',
  COMMERCIAL: 'Commercial',
  LAND: 'Land',
};

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  VACANT: 'Vacant',
  OCCUPIED: 'Occupied',
  MAINTENANCE: 'Maintenance',
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  ACTIVE: 'Active',
  UNDER_OFFER: 'Under offer',
  SOLD: 'Sold',
  WITHDRAWN: 'Withdrawn',
};

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  VIEWING: 'Viewing',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

/** Stages a lead can be moved to by hand; WON is only reached by closing a sale. */
export const OPEN_LEAD_STAGES = ['NEW', 'CONTACTED', 'VIEWING', 'NEGOTIATION'] as const satisfies readonly LeadStage[];

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

/** Roles allowed to operate inside a workspace, by capability. */
export const ROLE_CAPABILITIES = {
  manageRooms: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER', 'FRONT_DESK'],
  frontDesk: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER', 'FRONT_DESK'],
  housekeeping: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPER'],
  verifyHousekeeping: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER'],
  pos: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER', 'FRONT_DESK', 'POS_CASHIER'],
  reports: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER'],
  rentals: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER', 'PROPERTY_MANAGER'],
  sales: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER', 'SALES_AGENT'],
  analytics: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER'],
  hotel: ['PLATFORM_ADMIN', 'HOTEL_OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPER', 'POS_CASHIER'],
} as const satisfies Record<string, readonly UserRole[]>;

export type Capability = keyof typeof ROLE_CAPABILITIES;

export function hasCapability(role: UserRole, capability: Capability): boolean {
  return (ROLE_CAPABILITIES[capability] as readonly UserRole[]).includes(role);
}
