import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';
import { LoginInput } from '@secureprint/validation';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async validateUser(email: string, pass: string, ipAddress?: string) {
    const normalizedEmail = email.trim().toLowerCase();

    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      });
    } catch (err: any) {
      this.logger.error(`[AUTH_DATABASE_ERROR] Database query failed for ${normalizedEmail}: ${err.message}`, err.stack);
      throw new InternalServerErrorException('An unexpected internal error occurred. Please contact support.');
    }

    if (!user) {
      this.logger.warn(`[AUTH_INVALID_CREDENTIALS] User not found: ${normalizedEmail}`);
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        entity: 'USER',
        metadata: { email: normalizedEmail, reason: 'USER_NOT_FOUND' },
        ipAddress,
      });
      return null;
    }

    if (!user.isActive) {
      this.logger.warn(`[AUTH_USER_DISABLED] User account is deactivated: ${normalizedEmail}`);
      await this.auditService.log({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'USER',
        metadata: { email: normalizedEmail, reason: 'USER_DISABLED' },
        ipAddress,
      });
      return null;
    }

    if (!user.passwordHash) {
      this.logger.error(`[AUTH_CONFIGURATION_ERROR] Missing password hash for user: ${normalizedEmail}`);
      await this.auditService.log({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'USER',
        metadata: { email: normalizedEmail, reason: 'MISSING_PASSWORD_HASH' },
        ipAddress,
      });
      return null;
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(pass, user.passwordHash);
    } catch (err: any) {
      this.logger.error(`[AUTH_INTERNAL_ERROR] Bcrypt comparison error for ${normalizedEmail}: ${err.message}`);
      return null;
    }

    if (!isMatch) {
      this.logger.warn(`[AUTH_INVALID_CREDENTIALS] Password mismatch for ${normalizedEmail}`);
      await this.auditService.log({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'USER',
        metadata: { email: normalizedEmail, reason: 'INVALID_PASSWORD' },
        ipAddress,
      });
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginInput, ipAddress?: string) {
    const normalizedEmail = loginDto.email.trim().toLowerCase();
    const user = await this.validateUser(normalizedEmail, loginDto.password, ipAddress);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
    };

    let token: string;
    try {
      token = this.jwtService.sign(payload);
    } catch (err: any) {
      this.logger.error(`[AUTH_CONFIGURATION_ERROR] Failed to sign JWT token for ${user.email}: ${err.message}`);
      throw new InternalServerErrorException('An unexpected internal error occurred. Please contact support.');
    }

    this.logger.log(`[AUTH_SUCCESS] User ${user.email} (${user.role}) successfully logged in`);

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      shopId: user.shopId || undefined,
      action: 'LOGIN_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      ipAddress,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        shopId: user.shopId,
        shop: user.shop,
      },
    };
  }

  async getProfile(userId: string) {
    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          shopId: true,
          isActive: true,
          createdAt: true,
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              address: true,
              phone: true,
            },
          },
        },
      });
    } catch (err: any) {
      this.logger.error(`[AUTH_DATABASE_ERROR] Failed to fetch profile for user ${userId}: ${err.message}`);
      throw new InternalServerErrorException('An unexpected internal error occurred. Please contact support.');
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User session invalid.');
    }

    return user;
  }
}
