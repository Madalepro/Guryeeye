import type {
  Cleanliness,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  PaymentMethod,
  PosOrderStatus,
  PosOutletType,
  ReservationStatus,
  RoomStatus,
  TaskPriority,
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
}

// ---------- Real-time events ----------

export type HotelEvent =
  | { type: 'room.updated'; hotelId: string; room: RoomDto }
  | { type: 'task.updated'; hotelId: string; task: HousekeepingTaskDto }
  | { type: 'task.deleted'; hotelId: string; taskId: string }
  | { type: 'order.updated'; hotelId: string; order: PosOrderDto }
  | { type: 'reservation.updated'; hotelId: string; reservation: ReservationDto };

export type HotelEventType = HotelEvent['type'];
