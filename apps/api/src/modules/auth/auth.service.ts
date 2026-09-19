import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';
import { LoginInput } from '@secureprint/validation';
import { UserRole } from '@secureprint/shared-types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
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

    if (!user || !user.isActive) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginInput, ipAddress?: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        entity: 'USER',
        metadata: { email: loginDto.email },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
    };

    const token = this.jwtService.sign(payload);

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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        shopId: true,
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

    if (!user) {
      throw new UnauthorizedException('User session invalid.');
    }

    return user;
  }
}
