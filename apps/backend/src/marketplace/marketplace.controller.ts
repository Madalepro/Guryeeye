import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  PropertyType,
  type MarketplaceStats,
  type PublicAgent,
  type PublicHotel,
  type PublicInquiryRequest,
  type PublicListing,
  type PublicListingQuery,
  type PublicProject,
} from '@guryeeye/shared';
import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Public } from '../auth/auth.decorators';
import { MarketplaceService } from './marketplace.service';

class ListingsQuery implements PublicListingQuery {
  @IsOptional() @IsIn(['rent', 'sale']) kind?: 'rent' | 'sale';
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsIn(Object.values(PropertyType)) type?: PropertyType;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(50) minBedrooms?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPriceCents?: number;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}

class InquiryDto implements PublicInquiryRequest {
  @IsString() listingId: string;
  @IsIn(['rent', 'sale']) kind: 'rent' | 'sale';
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsString() @MinLength(5) @MaxLength(40) phone: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
}

@Public()
@Controller('public')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get('stats')
  stats(): Promise<MarketplaceStats> {
    return this.marketplace.stats();
  }

  @Get('listings')
  listings(@Query() q: ListingsQuery): Promise<PublicListing[]> {
    return this.marketplace.listings(q);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('inquiries')
  @HttpCode(201)
  inquire(@Body() body: InquiryDto): Promise<{ ok: true }> {
    return this.marketplace.inquire(body);
  }

  @Get('hotels')
  hotels(): Promise<PublicHotel[]> {
    return this.marketplace.hotels();
  }

  @Get('agents')
  agents(): Promise<PublicAgent[]> {
    return this.marketplace.agents();
  }

  @Get('projects')
  projects(): Promise<PublicProject[]> {
    return this.marketplace.projects();
  }
}
