import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(LoginRateLimitGuard.name);
  private readonly attempts = new Map<string, AttemptRecord>();

  // Configuration: max 5 attempts within 15 minutes window
  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const email = (req.body?.email || '').trim().toLowerCase();
    const key = `${ip}:${email}`;

    const now = Date.now();
    const record = this.attempts.get(key);

    if (record) {
      // Check if currently blocked
      if (record.blockedUntil && now < record.blockedUntil) {
        const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
        this.logger.warn(`[AUTH_RATE_LIMITED] IP/Email ${key} is blocked. Retry in ${remainingMinutes}m`);
        throw new HttpException(
          `Too many login attempts. Please try again after ${remainingMinutes} minute(s).`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Reset window if expired
      if (now - record.firstAttemptAt > this.WINDOW_MS) {
        this.attempts.set(key, { count: 1, firstAttemptAt: now });
        return true;
      }

      // Increment attempt count
      record.count += 1;
      if (record.count > this.MAX_ATTEMPTS) {
        record.blockedUntil = now + this.BLOCK_DURATION_MS;
        this.logger.warn(`[AUTH_RATE_LIMITED] IP/Email ${key} exceeded ${this.MAX_ATTEMPTS} attempts. Blocked for 15m.`);
        throw new HttpException(
          'Too many login attempts. Please try again after 15 minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } else {
      this.attempts.set(key, { count: 1, firstAttemptAt: now });
    }

    // Clean up old records periodically
    if (this.attempts.size > 10000) {
      for (const [k, v] of this.attempts.entries()) {
        if (now - v.firstAttemptAt > this.WINDOW_MS && (!v.blockedUntil || now > v.blockedUntil)) {
          this.attempts.delete(k);
        }
      }
    }

    return true;
  }

  // Call on successful login to reset the attempt counter
  resetAttempts(ip: string, email: string) {
    const key = `${ip}:${email.trim().toLowerCase()}`;
    this.attempts.delete(key);
  }
}
