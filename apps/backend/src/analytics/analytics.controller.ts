import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import type { PlatformAnalytics } from '@guryeeye/shared';
import { RequireCapability } from '../auth/auth.decorators';
import { assertRange, DateRangeQuery } from '../common/date-range.dto';
import { AnalyticsService } from './analytics.service';

@RequireCapability('analytics')
@Controller('hotels/:hotelId/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  summary(@Param('hotelId') hotelId: string, @Query() q: DateRangeQuery): Promise<PlatformAnalytics> {
    if (!q.from || !q.to) throw new BadRequestException('`from` and `to` are required');
    assertRange(q.from, q.to);
    return this.analytics.summary(hotelId, q.from, q.to);
  }
}
