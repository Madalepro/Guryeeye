import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import { validateEnv } from './config/env';
import { EventsModule } from './events/events.module';
import { HealthController } from './health/health.controller';
import { HotelsModule } from './hotels/hotels.module';
import { HousekeepingModule } from './housekeeping/housekeeping.module';
import { PosModule } from './pos/pos.module';
import { PrismaModule } from './prisma/prisma.module';
import { RentalsModule } from './rentals/rentals.module';
import { ReportsModule } from './reports/reports.module';
import { ReservationsModule } from './reservations/reservations.module';
import { RoomsModule } from './rooms/rooms.module';
import { SalesModule } from './sales/sales.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    PrismaModule,
    EventsModule,
    AuthModule,
    HotelsModule,
    RoomsModule,
    ReservationsModule,
    HousekeepingModule,
    PosModule,
    ReportsModule,
    RentalsModule,
    SalesModule,
    AnalyticsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
