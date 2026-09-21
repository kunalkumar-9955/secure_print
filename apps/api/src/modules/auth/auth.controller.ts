import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
  Ip,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LoginRateLimitGuard } from '../../common/guards/login-rate-limit.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Response } from 'express';
import { LoginSchema, LoginInput } from '@secureprint/validation';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private rateLimitGuard: LoginRateLimitGuard,
  ) {}

  @Post('login')
  @UseGuards(LoginRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginInput,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.errors.map((e) => e.message).join(', ');
      throw new BadRequestException(messages || 'Invalid email or password format.');
    }

    const result = await this.authService.login(parsed.data, ip);

    // Reset rate limiter on successful authentication
    this.rateLimitGuard.resetAttempts(ip, parsed.data.email);

    // Set cookie: in production cross-site (Vercel -> Render), sameSite='none' & secure=true are mandatory
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    return {
      success: true,
      data: { message: 'Logged out successfully' },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser('id') userId: string) {
    const user = await this.authService.getProfile(userId);
    return {
      success: true,
      data: user,
    };
  }
}
