import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { TokenPayload } from '../../modules/auth/auth.types';

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'creditCard'];

@Catch()
export class SlackExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SlackExceptionFilter.name);
  private webhookUrl: string;

  constructor(private configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>('WEB_HOOK');
  }

  private sanitizeBody(body: Record<string, any>): Record<string, any> {
    if (!body) return body;
    const sanitized = { ...body };
    for (const key of SENSITIVE_FIELDS) {
      if (key in sanitized) sanitized[key] = '***';
    }
    return sanitized;
  }

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { user?: TokenPayload }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      const errorMessage =
        exception instanceof HttpException
          ? exception.message
          : 'Internal server error';

      const user = request.user;
      const userId = user?.phoneNumber ?? 'N/A';
      const tenantId = user?.tenantId ?? 'N/A';
      const sanitizedBody = this.sanitizeBody(request.body);
      const stack =
        exception instanceof Error ? exception.stack : String(exception);

      if (process.env.NODE_ENV === 'production') {
        const blocks = [
          {
            type: 'header',
            text: { type: 'plain_text', text: '🚨 Server Error' },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Error:*\n${errorMessage}` },
              { type: 'mrkdwn', text: `*Endpoint:*\n\`${request.method} ${request.url}\`` },
              { type: 'mrkdwn', text: `*User ID:*\n${userId}` },
              { type: 'mrkdwn', text: `*Tenant ID:*\n${tenantId}` },
            ],
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Body:*\n\`\`\`${JSON.stringify(sanitizedBody, null, 2)}\`\`\`` },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Stack:*\n\`\`\`${stack.slice(0, 1500)}\`\`\`` },
          },
        ];

        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks, text: `Error in ${request.method} ${request.url}` }),
        }).catch((e) => this.logger.error('Slack notify failed', e));
      } else {
        this.logger.error(
          `[${request.method} ${request.url}] ${errorMessage}`,
          stack,
        );
        this.logger.error({ userId, tenantId, body: sanitizedBody });
      }
    }

    response.status(status).json({
      statusCode: status,
      message: status >= 500 ? 'Internal server error' : exception['message'],
    });
  }
}
