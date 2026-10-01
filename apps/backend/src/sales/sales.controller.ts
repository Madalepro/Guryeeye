import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ListingStatus,
  OPEN_LEAD_STAGES,
  PropertyType,
  type AuthUser,
  type CloseSaleRequest,
  type CreateSaleLeadRequest,
  type CreateSaleListingRequest,
  type SaleLeadDto,
  type SaleListingDto,
  type SalesOverview,
  type SaleTransactionDto,
  type UpdateSaleLeadRequest,
  type UpdateSaleListingRequest,
} from '@guryeeye/shared';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { CurrentUser, RequireCapability } from '../auth/auth.decorators';
import { SalesService } from './sales.service';

const MAX_PRICE_CENTS = 2_000_000_000;

class CreateListingDto implements CreateSaleListingRequest {
  @IsString() @MinLength(2) @MaxLength(160) title: string;
  @IsIn(Object.values(PropertyType)) type: PropertyType;
  @IsString() @MinLength(2) @MaxLength(200) address: string;
  @IsString() @MinLength(1) @MaxLength(80) city: string;
  @IsOptional() @IsInt() @Min(0) @Max(50) bedrooms?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1_000_000) areaSqm?: number;
  @IsInt() @Min(1) @Max(MAX_PRICE_CENTS) askingPriceCents: number;
}

class UpdateListingDto implements UpdateSaleListingRequest {
  @IsOptional() @IsIn(Object.values(ListingStatus).filter((s) => s !== 'SOLD')) status?: UpdateSaleListingRequest['status'];
  @IsOptional() @IsInt() @Min(1) @Max(MAX_PRICE_CENTS) askingPriceCents?: number;
}

class CreateLeadDto implements CreateSaleLeadRequest {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() listingId?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

class UpdateLeadDto implements UpdateSaleLeadRequest {
  @IsOptional() @IsIn([...OPEN_LEAD_STAGES, 'LOST']) stage?: UpdateSaleLeadRequest['stage'];
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(MAX_PRICE_CENTS) offerCents?: number | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() listingId?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(1000) notes?: string | null;
}

class CloseSaleDto implements CloseSaleRequest {
  @IsInt() @Min(1) @Max(MAX_PRICE_CENTS) priceCents: number;
  @IsOptional() @IsInt() @Min(0) @Max(2_000) commissionBps?: number;
}

class ListingsQuery {
  @IsOptional() @IsIn(Object.values(ListingStatus)) status?: ListingStatus;
}

@RequireCapability('sales')
@Controller('hotels/:hotelId/sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get('overview')
  overview(@Param('hotelId') hotelId: string): Promise<SalesOverview> {
    return this.sales.overview(hotelId);
  }

  @Get('listings')
  listings(@Param('hotelId') hotelId: string, @Query() q: ListingsQuery): Promise<SaleListingDto[]> {
    return this.sales.listings(hotelId, q.status);
  }

  @Post('listings')
  createListing(@Param('hotelId') hotelId: string, @Body() body: CreateListingDto): Promise<SaleListingDto> {
    return this.sales.createListing(hotelId, body);
  }

  @Patch('listings/:listingId')
  updateListing(
    @Param('hotelId') hotelId: string,
    @Param('listingId') listingId: string,
    @Body() body: UpdateListingDto,
  ): Promise<SaleListingDto> {
    return this.sales.updateListing(hotelId, listingId, body);
  }

  @Get('leads')
  leads(@Param('hotelId') hotelId: string): Promise<SaleLeadDto[]> {
    return this.sales.leads(hotelId);
  }

  @Post('leads')
  createLead(@Param('hotelId') hotelId: string, @Body() body: CreateLeadDto, @CurrentUser() user: AuthUser): Promise<SaleLeadDto> {
    return this.sales.createLead(hotelId, body, user);
  }

  @Patch('leads/:leadId')
  updateLead(@Param('hotelId') hotelId: string, @Param('leadId') leadId: string, @Body() body: UpdateLeadDto): Promise<SaleLeadDto> {
    return this.sales.updateLead(hotelId, leadId, body);
  }

  @Post('leads/:leadId/close')
  closeSale(@Param('hotelId') hotelId: string, @Param('leadId') leadId: string, @Body() body: CloseSaleDto): Promise<SaleTransactionDto> {
    return this.sales.closeSale(hotelId, leadId, body);
  }

  @Get('transactions')
  transactions(@Param('hotelId') hotelId: string): Promise<SaleTransactionDto[]> {
    return this.sales.transactions(hotelId);
  }
}
