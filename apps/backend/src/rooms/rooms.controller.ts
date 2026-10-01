import { Body, Controller, ForbiddenException, Get, Param, Patch } from '@nestjs/common';
import {
  Cleanliness,
  hasCapability,
  RoomStatus,
  type AuthUser,
  type RoomDto,
  type RoomTypeDto,
  type UpdateRoomStatusRequest,
} from '@guryeeye/shared';
import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { CurrentUser, RequireCapability } from '../auth/auth.decorators';
import { RoomsService } from './rooms.service';

class UpdateRoomStatusDto implements UpdateRoomStatusRequest {
  @IsOptional()
  @IsIn(Object.values(RoomStatus))
  status?: RoomStatus;

  @IsOptional()
  @IsIn(Object.values(Cleanliness))
  cleanliness?: Cleanliness;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

@RequireCapability('hotel')
@Controller('hotels/:hotelId')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get('rooms')
  list(@Param('hotelId') hotelId: string): Promise<RoomDto[]> {
    return this.rooms.list(hotelId);
  }

  @Get('room-types')
  roomTypes(@Param('hotelId') hotelId: string): Promise<RoomTypeDto[]> {
    return this.rooms.roomTypes(hotelId);
  }

  @RequireCapability('housekeeping')
  @Patch('rooms/:roomId/status')
  updateStatus(
    @Param('hotelId') hotelId: string,
    @Param('roomId') roomId: string,
    @Body() body: UpdateRoomStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomDto> {
    if (body.status && !hasCapability(user.role, 'manageRooms')) {
      throw new ForbiddenException('Only front desk and management can change room status');
    }
    return this.rooms.updateStatus(hotelId, roomId, body);
  }
}
