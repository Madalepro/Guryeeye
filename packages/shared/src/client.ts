import type {
  ApiErrorBody,
  AuthUser,
  AutoGenerateTasksResponse,
  CheckInRequest,
  CloseSaleRequest,
  CreateMaintenanceRequest,
  CreateHotelRequest,
  CreateHousekeepingTaskRequest,
  CreateLeaseRequest,
  CreatePosOrderRequest,
  CreateRentalPropertyRequest,
  CreateReservationRequest,
  CreateSaleLeadRequest,
  CreateSaleListingRequest,
  FolioDto,
  HotelSummary,
  HousekeepingTaskDto,
  IsoDate,
  LeaseDto,
  LoginRequest,
  LoginResponse,
  MaintenanceRequestDto,
  MarketplaceStats,
  PayPosOrderRequest,
  PayRentRequest,
  PlatformAnalytics,
  PlatformOverview,
  PosOrderDto,
  PosOutletDto,
  PublicAgent,
  PublicHotel,
  PublicInquiryRequest,
  PublicListing,
  PublicListingQuery,
  PublicProject,
  RegisterRequest,
  RentalInquiryDto,
  RentalPropertyDto,
  RentalsOverview,
  RentPaymentDto,
  ReportSummary,
  ReservationDto,
  RoomDto,
  RoomTypeDto,
  SaleLeadDto,
  SaleListingDto,
  SalesOverview,
  SaleTransactionDto,
  StaffMemberDto,
  TenantDto,
  UpdateHousekeepingTaskRequest,
  UpdateMaintenanceRequest,
  UpdateRoomStatusRequest,
  UpdateSaleLeadRequest,
  UpdateSaleListingRequest,
  WorkspaceOverview,
} from './contracts';
import type {
  HousekeepingTaskStatus,
  LeaseStatus,
  ListingStatus,
  MaintenanceStatus,
  PosOrderStatus,
  RentPaymentStatus,
  ReservationStatus,
} from './domain';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
  ) {
    const msg = body?.message;
    super(Array.isArray(msg) ? msg.join(', ') : (msg ?? `Request failed with status ${status}`));
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  /** Base URL including the `/api` prefix, e.g. http://localhost:4000/api */
  baseUrl: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
}

type Query = Record<string, string | number | undefined>;

function qs(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params.set(k, String(v));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function createApiClient(opts: ApiClientOptions) {
  const doFetch = opts.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const base = opts.baseUrl.replace(/\/$/, '');

  async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = opts.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await doFetch(`${base}${path}${qs(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401) opts.onUnauthorized?.();
    if (!res.ok) {
      let errBody: ApiErrorBody | null = null;
      try {
        errBody = (await res.json()) as ApiErrorBody;
      } catch {
        // non-JSON error body
      }
      throw new ApiError(res.status, errBody);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  const h = (hotelId: string) => `/hotels/${encodeURIComponent(hotelId)}`;

  return {
    /** URL for the server-sent events stream (EventSource cannot send headers). */
    eventsUrl(hotelId: string): string {
      const token = opts.getToken?.();
      return `${base}${h(hotelId)}/events${qs({ access_token: token ?? undefined })}`;
    },

    auth: {
      login: (body: LoginRequest) => request<LoginResponse>('POST', '/auth/login', body),
      me: () => request<AuthUser>('GET', '/auth/me'),
      register: (body: RegisterRequest) => request<LoginResponse>('POST', '/auth/register', body),
    },

    marketplace: {
      stats: () => request<MarketplaceStats>('GET', '/public/stats'),
      listings: (query?: PublicListingQuery) =>
        request<PublicListing[]>('GET', '/public/listings', undefined, query as Query | undefined),
      inquire: (body: PublicInquiryRequest) => request<{ ok: true }>('POST', '/public/inquiries', body),
      hotels: () => request<PublicHotel[]>('GET', '/public/hotels'),
      agents: () => request<PublicAgent[]>('GET', '/public/agents'),
      projects: () => request<PublicProject[]>('GET', '/public/projects'),
    },

    hotels: {
      list: () => request<HotelSummary[]>('GET', '/hotels'),
      get: (hotelId: string) => request<HotelSummary>('GET', h(hotelId)),
      create: (body: CreateHotelRequest) => request<HotelSummary>('POST', '/hotels', body),
      overview: (hotelId: string) => request<WorkspaceOverview>('GET', `${h(hotelId)}/overview`),
    },

    rooms: {
      list: (hotelId: string) => request<RoomDto[]>('GET', `${h(hotelId)}/rooms`),
      types: (hotelId: string) => request<RoomTypeDto[]>('GET', `${h(hotelId)}/room-types`),
      updateStatus: (hotelId: string, roomId: string, body: UpdateRoomStatusRequest) =>
        request<RoomDto>('PATCH', `${h(hotelId)}/rooms/${roomId}/status`, body),
    },

    reservations: {
      list: (hotelId: string, query?: { from?: IsoDate; to?: IsoDate; status?: ReservationStatus }) =>
        request<ReservationDto[]>('GET', `${h(hotelId)}/reservations`, undefined, query),
      create: (hotelId: string, body: CreateReservationRequest) =>
        request<ReservationDto>('POST', `${h(hotelId)}/reservations`, body),
      checkIn: (hotelId: string, id: string, body: CheckInRequest = {}) =>
        request<ReservationDto>('POST', `${h(hotelId)}/reservations/${id}/check-in`, body),
      checkOut: (hotelId: string, id: string) =>
        request<ReservationDto>('POST', `${h(hotelId)}/reservations/${id}/check-out`, {}),
      cancel: (hotelId: string, id: string) =>
        request<ReservationDto>('POST', `${h(hotelId)}/reservations/${id}/cancel`, {}),
      folio: (hotelId: string, id: string) =>
        request<FolioDto>('GET', `${h(hotelId)}/reservations/${id}/folio`),
    },

    housekeeping: {
      tasks: (hotelId: string, query?: { status?: HousekeepingTaskStatus }) =>
        request<HousekeepingTaskDto[]>('GET', `${h(hotelId)}/housekeeping/tasks`, undefined, query),
      staff: (hotelId: string) => request<StaffMemberDto[]>('GET', `${h(hotelId)}/housekeeping/staff`),
      create: (hotelId: string, body: CreateHousekeepingTaskRequest) =>
        request<HousekeepingTaskDto>('POST', `${h(hotelId)}/housekeeping/tasks`, body),
      update: (hotelId: string, taskId: string, body: UpdateHousekeepingTaskRequest) =>
        request<HousekeepingTaskDto>('PATCH', `${h(hotelId)}/housekeeping/tasks/${taskId}`, body),
      autoGenerate: (hotelId: string) =>
        request<AutoGenerateTasksResponse>('POST', `${h(hotelId)}/housekeeping/auto-generate`, {}),
    },

    pos: {
      outlets: (hotelId: string) => request<PosOutletDto[]>('GET', `${h(hotelId)}/pos/outlets`),
      orders: (hotelId: string, query?: { status?: PosOrderStatus; outletId?: string }) =>
        request<PosOrderDto[]>('GET', `${h(hotelId)}/pos/orders`, undefined, query),
      createOrder: (hotelId: string, body: CreatePosOrderRequest) =>
        request<PosOrderDto>('POST', `${h(hotelId)}/pos/orders`, body),
      pay: (hotelId: string, orderId: string, body: PayPosOrderRequest) =>
        request<PosOrderDto>('POST', `${h(hotelId)}/pos/orders/${orderId}/pay`, body),
      void: (hotelId: string, orderId: string) =>
        request<PosOrderDto>('POST', `${h(hotelId)}/pos/orders/${orderId}/void`, {}),
    },

    reports: {
      summary: (hotelId: string, query: { from: IsoDate; to: IsoDate }) =>
        request<ReportSummary>('GET', `${h(hotelId)}/reports/summary`, undefined, query),
    },

    rentals: {
      overview: (hotelId: string) => request<RentalsOverview>('GET', `${h(hotelId)}/rentals/overview`),
      properties: (hotelId: string) => request<RentalPropertyDto[]>('GET', `${h(hotelId)}/rentals/properties`),
      createProperty: (hotelId: string, body: CreateRentalPropertyRequest) =>
        request<RentalPropertyDto>('POST', `${h(hotelId)}/rentals/properties`, body),
      tenants: (hotelId: string) => request<TenantDto[]>('GET', `${h(hotelId)}/rentals/tenants`),
      leases: (hotelId: string, query?: { status?: LeaseStatus }) =>
        request<LeaseDto[]>('GET', `${h(hotelId)}/rentals/leases`, undefined, query),
      createLease: (hotelId: string, body: CreateLeaseRequest) =>
        request<LeaseDto>('POST', `${h(hotelId)}/rentals/leases`, body),
      endLease: (hotelId: string, leaseId: string) =>
        request<LeaseDto>('POST', `${h(hotelId)}/rentals/leases/${leaseId}/end`, {}),
      payments: (hotelId: string, query?: { status?: RentPaymentStatus }) =>
        request<RentPaymentDto[]>('GET', `${h(hotelId)}/rentals/payments`, undefined, query),
      pay: (hotelId: string, paymentId: string, body: PayRentRequest) =>
        request<RentPaymentDto>('POST', `${h(hotelId)}/rentals/payments/${paymentId}/pay`, body),
    },

    sales: {
      overview: (hotelId: string) => request<SalesOverview>('GET', `${h(hotelId)}/sales/overview`),
      listings: (hotelId: string, query?: { status?: ListingStatus }) =>
        request<SaleListingDto[]>('GET', `${h(hotelId)}/sales/listings`, undefined, query),
      createListing: (hotelId: string, body: CreateSaleListingRequest) =>
        request<SaleListingDto>('POST', `${h(hotelId)}/sales/listings`, body),
      updateListing: (hotelId: string, listingId: string, body: UpdateSaleListingRequest) =>
        request<SaleListingDto>('PATCH', `${h(hotelId)}/sales/listings/${listingId}`, body),
      leads: (hotelId: string) => request<SaleLeadDto[]>('GET', `${h(hotelId)}/sales/leads`),
      createLead: (hotelId: string, body: CreateSaleLeadRequest) =>
        request<SaleLeadDto>('POST', `${h(hotelId)}/sales/leads`, body),
      updateLead: (hotelId: string, leadId: string, body: UpdateSaleLeadRequest) =>
        request<SaleLeadDto>('PATCH', `${h(hotelId)}/sales/leads/${leadId}`, body),
      closeSale: (hotelId: string, leadId: string, body: CloseSaleRequest) =>
        request<SaleTransactionDto>('POST', `${h(hotelId)}/sales/leads/${leadId}/close`, body),
      transactions: (hotelId: string) => request<SaleTransactionDto[]>('GET', `${h(hotelId)}/sales/transactions`),
    },

    rpm: {
      maintenance: (hotelId: string, query?: { status?: MaintenanceStatus }) =>
        request<MaintenanceRequestDto[]>('GET', `${h(hotelId)}/rpm/maintenance`, undefined, query),
      createMaintenance: (hotelId: string, body: CreateMaintenanceRequest) =>
        request<MaintenanceRequestDto>('POST', `${h(hotelId)}/rpm/maintenance`, body),
      updateMaintenance: (hotelId: string, id: string, body: UpdateMaintenanceRequest) =>
        request<MaintenanceRequestDto>('PATCH', `${h(hotelId)}/rpm/maintenance/${id}`, body),
      inquiries: (hotelId: string) => request<RentalInquiryDto[]>('GET', `${h(hotelId)}/rpm/inquiries`),
      handleInquiry: (hotelId: string, id: string) =>
        request<RentalInquiryDto>('POST', `${h(hotelId)}/rpm/inquiries/${id}/handled`, {}),
    },

    analytics: {
      summary: (hotelId: string, query: { from: IsoDate; to: IsoDate }) =>
        request<PlatformAnalytics>('GET', `${h(hotelId)}/analytics`, undefined, query),
    },

    admin: {
      overview: () => request<PlatformOverview>('GET', '/admin/overview'),
      setVerified: (accountId: string, verified: boolean) =>
        request<{ id: string; verified: boolean }>('PATCH', `/admin/accounts/${encodeURIComponent(accountId)}`, { verified }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
