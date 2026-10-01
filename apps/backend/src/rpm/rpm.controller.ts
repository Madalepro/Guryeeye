import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  MaintenanceStatus,
  TaskPriority,
  type CreateMaintenanceRequest,
  type MaintenanceRequestDto,
  type RentalInquiryDto,
  type UpdateMaintenanceRequest,
} from '@guryeeye/shared';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { RequireCapability } from '../auth/auth.decorators';
import { RpmService } from './rpm.service';

class CreateMaintenanceDto implements CreateMaintenanceRequest {
  @IsString() unitId: string;
  @IsString() @MinLength(2) @MaxLength(160) title: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(Object.values(TaskPriority)) priority?: TaskPriority;
  @IsOptional() @IsBoolean() blockUnit?: boolean;
}

class UpdateMaintenanceDto implements UpdateMaintenanceRequest {
  @IsOptional() @IsIn(Object.values(MaintenanceStatus)) status?: MaintenanceStatus;
  @IsOptional() @IsIn(Object.values(TaskPriority)) priority?: TaskPriority;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(100_000_000) costCents?: number | null;
}

class MaintenanceQuery {
  @IsOptional() @IsIn(Object.values(MaintenanceStatus)) status?: MaintenanceStatus;
}

@RequireCapability('rentals')
@Controller('hotels/:hotelId/rpm')
export class RpmController {
  constructor(private readonly rpm: RpmService) {}

  @Get('maintenance')
  maintenance(@Param('hotelId') hotelId: string, @Query() q: MaintenanceQuery): Promise<MaintenanceRequestDto[]> {
    return this.rpm.maintenance(hotelId, q.status);
  }

  @Post('maintenance')
  create(@Param('hotelId') hotelId: string, @Body() body: CreateMaintenanceDto): Promise<MaintenanceRequestDto> {
    return this.rpm.create(hotelId, body);
  }

  @Patch('maintenance/:id')
  update(@Param('hotelId') hotelId: string, @Param('id') id: string, @Body() body: UpdateMaintenanceDto): Promise<MaintenanceRequestDto> {
    return this.rpm.update(hotelId, id, body);
  }

  @Get('inquiries')
  inquiries(@Param('hotelId') hotelId: string): Promise<RentalInquiryDto[]> {
    return this.rpm.inquiries(hotelId);
  }

  @Post('inquiries/:id/handled')
  handle(@Param('hotelId') hotelId: string, @Param('id') id: string): Promise<RentalInquiryDto> {
    return this.rpm.handleInquiry(hotelId, id);
  }
}
