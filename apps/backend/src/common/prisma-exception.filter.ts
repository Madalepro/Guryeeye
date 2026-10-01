import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Maps Prisma's known request errors to HTTP responses instead of leaking 500s and SQL details. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const map: Record<string, [HttpStatus, string]> = {
      P2002: [HttpStatus.CONFLICT, 'A record with these unique fields already exists'],
      P2003: [HttpStatus.BAD_REQUEST, 'Referenced record does not exist'],
      P2025: [HttpStatus.NOT_FOUND, 'Record not found'],
    };
    const [status, message] = map[err.code] ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'Database error'];
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) this.logger.error(err.message, err.stack);
    res.status(status).json({ statusCode: status, message, error: err.code });
  }
}
