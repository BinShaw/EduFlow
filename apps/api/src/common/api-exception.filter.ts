import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('API');
  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { requestId: string }>();
    const response = ctx.getResponse<Response>();
    let status = 500;
    let message: string | string[] = 'An unexpected error occurred. Please retry.';
    if (error instanceof HttpException) {
      status = error.getStatus();
      const body = error.getResponse();
      message =
        typeof body === 'string'
          ? body
          : (body as { message?: string | string[] }).message || error.message;
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (['P2002', 'P2034'].includes(error.code)) {
        status = 409;
        message = 'The record changed or conflicts with another request. Refresh and try again.';
      }
      if (['P2023', 'P2003'].includes(error.code)) {
        status = 400;
        message = 'An invalid record reference was provided.';
      }
      if (error.code === 'P2025') {
        status = 404;
        message = 'The requested record was not found.';
      }
    } else if (error && typeof error === 'object' && 'status' in error) {
      if (error.status === 413) {
        status = 413;
        message = 'The request body is too large.';
      }
      if (error.status === 400) {
        status = 400;
        message = 'The request body is invalid.';
      }
    }
    if (status >= 500)
      this.logger.error({
        requestId: request.requestId,
        status,
        kind: error instanceof Error ? error.constructor.name : 'UnknownError',
      });
    response
      .status(status)
      .json({ statusCode: status, message, requestId: request.requestId || randomUUID() });
  }
}
