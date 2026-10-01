import type {
  Cleanliness,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  LeadStage,
  LeaseStatus,
  ListingStatus,
  PaymentMethod,
  PosOrderStatus,
  PosOutletType,
  PropertyType,
  RentPaymentStatus,
  ReservationStatus,
  RoomStatus,
  TaskPriority,
  UnitStatus,
  UserRole,
} from './domain';

/** ISO-8601 timestamp string as serialized over JSON. */
export type IsoDateTime = string;
/** Calendar date in YYYY-MM-DD form. */
export type IsoDate = string;

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// ---------- Auth ----------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hotelId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

// ---------- Hotels ----------

export interface HotelSummary {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
  taxRateBps: number;
  roomCount: number;
}

export interface CreateHotelRequest {
  name: string;
  slug: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
  taxRateBps: number;
}

// ---------- Rooms ----------

export interface RoomTypeDto {
  id: string;
  name: string;
  code: string;
  baseRateCents: number;
  capacity: number;
}

export interface RoomGuestSnapshot {
  reservationId: string;
  guestName: string;
  checkIn: IsoDate;
  checkOut: IsoDate;
  status: ReservationStatus;
}

export interface RoomDto {
  id: string;
  number: string;
  floor: number;
  status: RoomStatus;
  cleanliness: Cleanliness;
  notes: string | null;
  roomType: Pick<RoomTypeDto, 'id' | 'name' | 'code'>;
  /** In-house guest, or today's arrival for reserved rooms. */
  currentStay: RoomGuestSnapshot | null;
  openTaskCount: number;
  updatedAt: IsoDateTime;
}

export interface UpdateRoomStatusRequest {
  status?: RoomStatus;
  cleanliness?: Cleanliness;
  notes?: string | null;
}

// ---------- Reservations ----------

export interface ReservationDto {
  id: string;
  status: ReservationStatus;
  checkIn: IsoDate;
  checkOut: IsoDate;
  adults: number;
  rateCents: number;
  source: string;
  guest: { id: string; name: string; email: string | null; phone: string | null };
  room: { id: string; number: string } | null;
  roomType: { id: string; name: string };
}

export interface CreateReservationRequest {
  guest: { firstName: string; lastName: string; email?: string; phone?: string };
  roomTypeId: string;
  roomId?: string;
  checkIn: IsoDate;
  checkOut: IsoDate;
  adults: number;
  rateCents?: number;
  source?: string;
}

export interface CheckInRequest {
  roomId?: string;
}

export interface FolioLineDto {
  id: string;
  description: string;
  amountCents: number;
  source: 'ROOM' | 'POS' | 'OTHER';
  postedAt: IsoDateTime;
}

export interface FolioDto {
  reservationId: string;
  lines: FolioLineDto[];
  totalCents: number;
}

// ---------- Housekeeping ----------

export interface StaffMemberDto {
  id: string;
  name: string;
  role: UserRole;
  openTasks: number;
}

export interface HousekeepingTaskDto {
  id: string;
  type: HousekeepingTaskType;
  status: HousekeepingTaskStatus;
  priority: TaskPriority;
  notes: string | null;
  dueAt: IsoDateTime | null;
  startedAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  room: { id: string; number: string; floor: number; status: RoomStatus; cleanliness: Cleanliness };
  assignee: { id: string; name: string } | null;
}

export interface CreateHousekeepingTaskRequest {
  roomId: string;
  type: HousekeepingTaskType;
  priority?: TaskPriority;
  assigneeId?: string | null;
  notes?: string;
  dueAt?: IsoDateTime;
}

export interface UpdateHousekeepingTaskRequest {
  status?: HousekeepingTaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  notes?: string | null;
}

export interface AutoGenerateTasksResponse {
  created: number;
}

// ---------- POS ----------

export interface PosItemDto {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  active: boolean;
}

export interface PosOutletDto {
  id: string;
  name: string;
  type: PosOutletType;
  items: PosItemDto[];
}

export interface PosOrderLineDto {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface PosOrderDto {
  id: string;
  number: number;
  status: PosOrderStatus;
  outlet: { id: string; name: string };
  lines: PosOrderLineDto[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod | null;
  reservationId: string | null;
  roomNumber: string | null;
  createdAt: IsoDateTime;
  closedAt: IsoDateTime | null;
}

export interface CreatePosOrderRequest {
  outletId: string;
  lines: { itemId: string; quantity: number }[];
}

export interface PayPosOrderRequest {
  method: PaymentMethod;
  /** Required when method is ROOM_CHARGE; must be a checked-in reservation. */
  reservationId?: string;
}

// ---------- Reports ----------

export interface DailyOccupancyPoint {
  date: IsoDate;
  occupiedRooms: number;
  availableRooms: number;
  occupancyRate: number;
  roomRevenueCents: number;
}

export interface OutletRevenue {
  outletId: string;
  outletName: string;
  orders: number;
  revenueCents: number;
}

export interface HousekeepingStats {
  completed: number;
  pending: number;
  avgCompletionMinutes: number | null;
  byAssignee: { assigneeId: string | null; name: string; completed: number }[];
}

export interface ReportSummary {
  range: { from: IsoDate; to: IsoDate };
  currency: string;
  kpis: {
    occupancyRate: number;
    adrCents: number;
    revparCents: number;
    roomRevenueCents: number;
    posRevenueCents: number;
    totalRevenueCents: number;
    roomNightsSold: number;
  };
  occupancy: DailyOccupancyPoint[];
  outlets: OutletRevenue[];
  housekeeping: HousekeepingStats;
  roomStatus: Record<RoomStatus, number>;
}

// ---------- Dashboard ----------

export interface WorkspaceOverview {
  hotel: HotelSummary;
  today: IsoDate;
  roomStatus: Record<RoomStatus, number>;
  cleanliness: Record<Cleanliness, number>;
  arrivals: ReservationDto[];
  departures: ReservationDto[];
  inHouse: number;
  openTasks: number;
  openOrders: number;
  todayRevenueCents: number;
}

// ---------- Rentals (Guryaha Kirada) ----------

export interface RentalUnitDto {
  id: string;
  label: string;
  bedrooms: number;
  monthlyRentCents: number;
  status: UnitStatus;
  /** Tenant on the active lease, if any. */
  tenant: { leaseId: string; name: string; endDate: IsoDate } | null;
}

export interface RentalPropertyDto {
  id: string;
  name: string;
  type: PropertyType;
  address: string;
  city: string;
  units: RentalUnitDto[];
}

export interface CreateRentalPropertyRequest {
  name: string;
  type: PropertyType;
  address: string;
  city: string;
  units: { label: string; bedrooms: number; monthlyRentCents: number }[];
}

export interface TenantDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  activeLeases: number;
}

export interface LeaseDto {
  id: string;
  status: LeaseStatus;
  startDate: IsoDate;
  endDate: IsoDate;
  monthlyRentCents: number;
  depositCents: number;
  tenant: { id: string; name: string; phone: string | null };
  unit: { id: string; label: string };
  property: { id: string; name: string };
  balanceDueCents: number;
}

export interface CreateLeaseRequest {
  unitId: string;
  tenant: { name: string; phone?: string; email?: string };
  startDate: IsoDate;
  endDate: IsoDate;
  monthlyRentCents?: number;
  depositCents?: number;
}

export interface RentPaymentDto {
  id: string;
  leaseId: string;
  period: IsoDate;
  dueDate: IsoDate;
  amountCents: number;
  status: RentPaymentStatus;
  overdue: boolean;
  method: PaymentMethod | null;
  paidAt: IsoDateTime | null;
  tenantName: string;
  unitLabel: string;
  propertyName: string;
}

export interface PayRentRequest {
  method: Exclude<PaymentMethod, 'ROOM_CHARGE'>;
}

export interface RentalsOverview {
  currency: string;
  today: IsoDate;
  properties: number;
  units: number;
  unitStatus: Record<UnitStatus, number>;
  occupancyRate: number;
  monthlyRentRollCents: number;
  collectedThisMonthCents: number;
  outstandingCents: number;
  overdueCount: number;
  expiringSoon: LeaseDto[];
}

// ---------- Sales (Iibka) ----------

export interface SaleListingDto {
  id: string;
  title: string;
  type: PropertyType;
  address: string;
  city: string;
  bedrooms: number | null;
  areaSqm: number | null;
  askingPriceCents: number;
  status: ListingStatus;
  listedAt: IsoDateTime;
  leadCount: number;
}

export interface CreateSaleListingRequest {
  title: string;
  type: PropertyType;
  address: string;
  city: string;
  bedrooms?: number;
  areaSqm?: number;
  askingPriceCents: number;
}

export interface UpdateSaleListingRequest {
  status?: Exclude<ListingStatus, 'SOLD'>;
  askingPriceCents?: number;
}

export interface SaleLeadDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  stage: LeadStage;
  offerCents: number | null;
  notes: string | null;
  listing: { id: string; title: string; askingPriceCents: number; status: ListingStatus } | null;
  agent: { id: string; name: string } | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CreateSaleLeadRequest {
  name: string;
  phone?: string;
  email?: string;
  listingId?: string;
  notes?: string;
}

export interface UpdateSaleLeadRequest {
  stage?: Exclude<LeadStage, 'WON'>;
  offerCents?: number | null;
  listingId?: string | null;
  notes?: string | null;
}

export interface CloseSaleRequest {
  priceCents: number;
  commissionBps?: number;
}

export interface SaleTransactionDto {
  id: string;
  priceCents: number;
  commissionBps: number;
  commissionCents: number;
  closedAt: IsoDateTime;
  listing: { id: string; title: string; city: string };
  buyer: { id: string; name: string };
  agent: { id: string; name: string } | null;
}

export interface SalesOverview {
  currency: string;
  activeListings: number;
  underOffer: number;
  inventoryValueCents: number;
  pipelineValueCents: number;
  leadStages: Record<LeadStage, number>;
  soldLast30Days: number;
  volumeLast30DaysCents: number;
  commissionLast30DaysCents: number;
  recentTransactions: SaleTransactionDto[];
}

// ---------- Cross-service analytics ----------

export type ServiceKey = 'hotel' | 'rentals' | 'sales';

export interface AnalyticsPoint {
  date: IsoDate;
  hotelCents: number;
  rentalsCents: number;
  salesCents: number;
}

export interface PlatformAnalytics {
  range: { from: IsoDate; to: IsoDate };
  currency: string;
  /** Recognised revenue by service: hotel room + POS, rent collected, sales commission. */
  revenue: Record<ServiceKey, number> & { total: number };
  series: AnalyticsPoint[];
  hotel: { rooms: number; occupancyRate: number; adrCents: number };
  rentals: { units: number; occupancyRate: number; outstandingCents: number };
  sales: { activeListings: number; openLeads: number; volumeCents: number };
}

// ---------- Platform admin ----------

export interface PlatformOverview {
  hotels: number;
  rooms: number;
  users: number;
  activeReservations: number;
  revenueLast30DaysCents: number;
  hotelStats: (HotelSummary & {
    occupancyRate: number;
    revenueLast30DaysCents: number;
  })[];
  rentals: {
    properties: number;
    units: number;
    occupiedUnits: number;
    activeLeases: number;
    collectedLast30DaysCents: number;
    outstandingCents: number;
  };
  sales: {
    activeListings: number;
    openLeads: number;
    soldLast30Days: number;
    volumeLast30DaysCents: number;
    commissionLast30DaysCents: number;
  };
  /** Per-account totals across every service, trailing 30 days. */
  accountStats: {
    id: string;
    name: string;
    city: string;
    currency: string;
    hotelRevenueCents: number;
    rentalUnits: number;
    rentCollectedCents: number;
    activeListings: number;
    salesCommissionCents: number;
  }[];
}

// ---------- Real-time events ----------

export type HotelEvent =
  | { type: 'room.updated'; hotelId: string; room: RoomDto }
  | { type: 'task.updated'; hotelId: string; task: HousekeepingTaskDto }
  | { type: 'task.deleted'; hotelId: string; taskId: string }
  | { type: 'order.updated'; hotelId: string; order: PosOrderDto }
  | { type: 'reservation.updated'; hotelId: string; reservation: ReservationDto };

export type HotelEventType = HotelEvent['type'];
