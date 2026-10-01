import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import type { ReportSummary } from '@guryeeye/shared';
import { RequireCapability } from '../auth/auth.decorators';
import { assertRange, DateRangeQuery } from '../common/date-range.dto';
import { ReportsService } from './reports.service';

@RequireCapability('reports')
@Controller('hotels/:hotelId/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(@Param('hotelId') hotelId: string, @Query() q: DateRangeQuery): Promise<ReportSummary> {
    if (!q.from || !q.to) throw new BadRequestException('`from` and `to` are required');
    assertRange(q.from, q.to);
    return this.reports.summary(hotelId, q.from, q.to);
  }
}
