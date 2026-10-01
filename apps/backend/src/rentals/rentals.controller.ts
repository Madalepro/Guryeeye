import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  LeaseStatus,
  PaymentMethod,
  PropertyType,
  RentPaymentStatus,
  type CreateLeaseRequest,
  type CreateRentalPropertyRequest,
  type LeaseDto,
  type PayRentRequest,
  type RentalPropertyDto,
  type RentalsOverview,
  type RentPaymentDto,
  type TenantDto,
} from '@guryeeye/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RequireCapability } from '../auth/auth.decorators';
import { RentalsService } from './rentals.service';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CENTS = 100_000_000;

class UnitInputDto {
  @IsString() @MinLength(1) @MaxLength(20) label: string;
  @IsInt() @Min(0) @Max(20) bedrooms: number;
  @IsInt() @Min(0) @Max(MAX_CENTS) monthlyRentCents: number;
}

class CreatePropertyDto implements CreateRentalPropertyRequest {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsIn(Object.values(PropertyType)) type: PropertyType;
  @IsString() @MinLength(2) @MaxLength(200) address: string;
  @IsString() @MinLength(1) @MaxLength(80) city: string;
  @ValidateNested({ each: true })
  @Type(() => UnitInputDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  units: UnitInputDto[];
}

class TenantInputDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
}

class CreateLeaseDto implements CreateLeaseRequest {
  @IsString() unitId: string;
  @ValidateNested() @Type(() => TenantInputDto) tenant: TenantInputDto;
  @Matches(DATE_ONLY) startDate: string;
  @Matches(DATE_ONLY) endDate: string;
  @IsOptional() @IsInt() @Min(0) @Max(MAX_CENTS) monthlyRentCents?: number;
  @IsOptional() @IsInt() @Min(0) @Max(MAX_CENTS) depositCents?: number;
}

class PayRentDto implements PayRentRequest {
  @IsIn(Object.values(PaymentMethod).filter((m) => m !== 'ROOM_CHARGE'))
  method: PayRentRequest['method'];
}

class LeasesQuery {
  @IsOptional() @IsIn(Object.values(LeaseStatus)) status?: LeaseStatus;
}

class PaymentsQuery {
  @IsOptional() @IsIn(Object.values(RentPaymentStatus)) status?: RentPaymentStatus;
}

@RequireCapability('rentals')
@Controller('hotels/:hotelId/rentals')
export class RentalsController {
  constructor(private readonly rentals: RentalsService) {}

  @Get('overview')
  overview(@Param('hotelId') hotelId: string): Promise<RentalsOverview> {
    return this.rentals.overview(hotelId);
  }

  @Get('properties')
  properties(@Param('hotelId') hotelId: string): Promise<RentalPropertyDto[]> {
    return this.rentals.properties(hotelId);
  }

  @Post('properties')
  createProperty(@Param('hotelId') hotelId: string, @Body() body: CreatePropertyDto): Promise<RentalPropertyDto> {
    return this.rentals.createProperty(hotelId, body);
  }

  @Get('tenants')
  tenants(@Param('hotelId') hotelId: string): Promise<TenantDto[]> {
    return this.rentals.tenants(hotelId);
  }

  @Get('leases')
  leases(@Param('hotelId') hotelId: string, @Query() q: LeasesQuery): Promise<LeaseDto[]> {
    return this.rentals.leases(hotelId, q.status);
  }

  @Post('leases')
  createLease(@Param('hotelId') hotelId: string, @Body() body: CreateLeaseDto): Promise<LeaseDto> {
    return this.rentals.createLease(hotelId, body);
  }

  @Post('leases/:leaseId/end')
  endLease(@Param('hotelId') hotelId: string, @Param('leaseId') leaseId: string): Promise<LeaseDto> {
    return this.rentals.endLease(hotelId, leaseId);
  }

  @Get('payments')
  payments(@Param('hotelId') hotelId: string, @Query() q: PaymentsQuery): Promise<RentPaymentDto[]> {
    return this.rentals.payments(hotelId, q.status);
  }

  @Post('payments/:paymentId/pay')
  pay(
    @Param('hotelId') hotelId: string,
    @Param('paymentId') paymentId: string,
    @Body() body: PayRentDto,
  ): Promise<RentPaymentDto> {
    return this.rentals.pay(hotelId, paymentId, body);
  }
}
