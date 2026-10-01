import { Injectable, MessageEvent } from '@nestjs/common';
import type { HotelEvent } from '@guryeeye/shared';
import { filter, interval, map, merge, Observable, Subject } from 'rxjs';

const HEARTBEAT_MS = 25_000;

/**
 * In-process pub/sub for hotel events. A single API instance is assumed;
 * for horizontal scaling, back `publish` with Redis pub/sub or Postgres LISTEN/NOTIFY.
 */
@Injectable()
export class EventsService {
  private readonly bus = new Subject<HotelEvent>();

  publish(event: HotelEvent): void {
    this.bus.next(event);
  }

  stream(hotelId: string): Observable<MessageEvent> {
    const events = this.bus.pipe(
      filter((e) => e.hotelId === hotelId),
      map((e): MessageEvent => ({ data: e })),
    );
    // Keeps proxies/load balancers from closing idle connections.
    const heartbeat = interval(HEARTBEAT_MS).pipe(map((): MessageEvent => ({ type: 'ping', data: '' })));
    return merge(events, heartbeat);
  }
}
