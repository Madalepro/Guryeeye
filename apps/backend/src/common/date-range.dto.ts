import { BadRequestException } from '@nestjs/common';
import { nightsBetween, type IsoDate } from '@guryeeye/shared';
import { IsISO8601, IsOptional, Matches } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class DateRangeQuery {
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATE_ONLY, { message: 'from must be YYYY-MM-DD' })
  from?: IsoDate;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATE_ONLY, { message: 'to must be YYYY-MM-DD' })
  to?: IsoDate;
}

export function assertRange(from: IsoDate, to: IsoDate, maxDays = 366): void {
  if (from > to) throw new BadRequestException('`from` must be on or before `to`');
  if (nightsBetween(from, to) > maxDays) {
    throw new BadRequestException(`Date range cannot exceed ${maxDays} days`);
  }
}
