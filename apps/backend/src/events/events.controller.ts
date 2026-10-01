import { Controller, MessageEvent, Param, Sse } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { RequireCapability } from '../auth/auth.decorators';
import { EventsService } from './events.service';

@RequireCapability('hotel')
@Controller('hotels/:hotelId/events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Sse()
  stream(@Param('hotelId') hotelId: string): Observable<MessageEvent> {
    return this.events.stream(hotelId);
  }
}
