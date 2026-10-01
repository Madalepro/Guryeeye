import { Module } from '@nestjs/common';
import { RentalsModule } from '../rentals/rentals.module';
import { ReportsModule } from '../reports/reports.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [ReportsModule, RentalsModule],
  controllers: [AdminController],
})
export class AdminModule {}
