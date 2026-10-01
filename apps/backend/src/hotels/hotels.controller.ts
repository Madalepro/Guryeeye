import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { AuthUser, CreateHotelRequest, HotelSummary, WorkspaceOverview } from '@guryeeye/shared';
import { IsInt, IsString, IsTimeZone, Length, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CurrentUser, PlatformAdminOnly, RequireCapability } from '../auth/auth.decorators';
import { HotelsService } from './hotels.service';

class CreateHotelDto implements CreateHotelRequest {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, { message: 'slug must be kebab-case letters and digits' })
  @MaxLength(60)
  slug: string;
  @IsString() @MinLength(1) @MaxLength(80) city: string;
  @IsString() @MinLength(2) @MaxLength(80) country: string;
  @IsString() @Length(3, 3) currency: string;
  @IsTimeZone() timezone: string;
  @IsInt() @Min(0) @Max(5_000) taxRateBps: number;
}

@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotels: HotelsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<HotelSummary[]> {
    return this.hotels.list(user);
  }

  @PlatformAdminOnly()
  @Post()
  create(@Body() body: CreateHotelDto): Promise<HotelSummary> {
    return this.hotels.create(body);
  }

  @Get(':hotelId')
  get(@Param('hotelId') hotelId: string): Promise<HotelSummary> {
    return this.hotels.get(hotelId);
  }

  @RequireCapability('hotel')
  @Get(':hotelId/overview')
  overview(@Param('hotelId') hotelId: string): Promise<WorkspaceOverview> {
    return this.hotels.overview(hotelId);
  }
}
