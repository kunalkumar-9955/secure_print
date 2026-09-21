import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected internal error occurred. Please contact support.';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = res.message || message;
        code = res.error || code;
        details = res.details || (Array.isArray(res.message) ? res.message : undefined);
        if (Array.isArray(res.message)) {
          message = res.message.join(', ');
        }
      }
      code = HttpStatus[status] || code;
    } else if ((exception as any)?.name === 'ZodError') {
      status = HttpStatus.BAD_REQUEST;
      code = 'BAD_REQUEST';
      const zodErrors = (exception as any).errors || [];
      message = zodErrors.map((e: any) => e.message).join(', ') || 'Validation error';
      details = zodErrors;
    } else {
      const errMsg = exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`Unhandled exception caught in filter: ${errMsg}`, stack);
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
    });
  }
}
