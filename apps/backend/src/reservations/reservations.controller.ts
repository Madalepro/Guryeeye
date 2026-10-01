import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ReservationStatus,
  type CheckInRequest,
  type CreateReservationRequest,
  type FolioDto,
  type ReservationDto,
} from '@guryeeye/shared';
import { Type } from 'class-transformer';
import {
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
import { DateRangeQuery } from '../common/date-range.dto';
import { ReservationsService } from './reservations.service';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

class GuestInputDto {
  @IsString() @MinLength(1) @MaxLength(80) firstName: string;
  @IsString() @MinLength(1) @MaxLength(80) lastName: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
}

class CreateReservationDto implements CreateReservationRequest {
  @ValidateNested() @Type(() => GuestInputDto) guest: GuestInputDto;
  @IsString() roomTypeId: string;
  @IsOptional() @IsString() roomId?: string;
  @Matches(DATE_ONLY) checkIn: string;
  @Matches(DATE_ONLY) checkOut: string;
  @IsInt() @Min(1) @Max(20) adults: number;
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) rateCents?: number;
  @IsOptional() @IsString() @MaxLength(40) source?: string;
}

class CheckInDto implements CheckInRequest {
  @IsOptional() @IsString() roomId?: string;
}

class ListReservationsQuery extends DateRangeQuery {
  @IsOptional() @IsIn(Object.values(ReservationStatus)) status?: ReservationStatus;
}

@RequireCapability('frontDesk')
@Controller('hotels/:hotelId/reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  list(@Param('hotelId') hotelId: string, @Query() q: ListReservationsQuery): Promise<ReservationDto[]> {
    return this.reservations.list(hotelId, q);
  }

  @Post()
  create(@Param('hotelId') hotelId: string, @Body() body: CreateReservationDto): Promise<ReservationDto> {
    return this.reservations.create(hotelId, body);
  }

  @Post(':id/check-in')
  checkIn(
    @Param('hotelId') hotelId: string,
    @Param('id') id: string,
    @Body() body: CheckInDto,
  ): Promise<ReservationDto> {
    return this.reservations.checkIn(hotelId, id, body.roomId);
  }

  @Post(':id/check-out')
  checkOut(@Param('hotelId') hotelId: string, @Param('id') id: string): Promise<ReservationDto> {
    return this.reservations.checkOut(hotelId, id);
  }

  @Post(':id/cancel')
  cancel(@Param('hotelId') hotelId: string, @Param('id') id: string): Promise<ReservationDto> {
    return this.reservations.cancel(hotelId, id);
  }

  @Get(':id/folio')
  folio(@Param('hotelId') hotelId: string, @Param('id') id: string): Promise<FolioDto> {
    return this.reservations.folio(hotelId, id);
  }
}
