import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  PaymentMethod,
  PosOrderStatus,
  type AuthUser,
  type CreatePosOrderRequest,
  type PayPosOrderRequest,
  type PosOrderDto,
  type PosOutletDto,
} from '@guryeeye/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CurrentUser, RequireCapability } from '../auth/auth.decorators';
import { PosService } from './pos.service';

class OrderLineInputDto {
  @IsString() itemId: string;
  @IsInt() @Min(1) @Max(99) quantity: number;
}

class CreateOrderDto implements CreatePosOrderRequest {
  @IsString() outletId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderLineInputDto)
  lines: OrderLineInputDto[];
}

class PayOrderDto implements PayPosOrderRequest {
  @IsIn(Object.values(PaymentMethod)) method: PaymentMethod;
  @IsOptional() @IsString() reservationId?: string;
}

class ListOrdersQuery {
  @IsOptional() @IsIn(Object.values(PosOrderStatus)) status?: PosOrderStatus;
  @IsOptional() @IsString() outletId?: string;
}

@RequireCapability('pos')
@Controller('hotels/:hotelId/pos')
export class PosController {
  constructor(private readonly pos: PosService) {}

  @Get('outlets')
  outlets(@Param('hotelId') hotelId: string): Promise<PosOutletDto[]> {
    return this.pos.outlets(hotelId);
  }

  @Get('orders')
  orders(@Param('hotelId') hotelId: string, @Query() q: ListOrdersQuery): Promise<PosOrderDto[]> {
    return this.pos.orders(hotelId, q);
  }

  @Post('orders')
  create(
    @Param('hotelId') hotelId: string,
    @Body() body: CreateOrderDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PosOrderDto> {
    return this.pos.createOrder(hotelId, body, user);
  }

  @Post('orders/:orderId/pay')
  pay(
    @Param('hotelId') hotelId: string,
    @Param('orderId') orderId: string,
    @Body() body: PayOrderDto,
  ): Promise<PosOrderDto> {
    return this.pos.pay(hotelId, orderId, body);
  }

  @Post('orders/:orderId/void')
  void(@Param('hotelId') hotelId: string, @Param('orderId') orderId: string): Promise<PosOrderDto> {
    return this.pos.void(hotelId, orderId);
  }
}
