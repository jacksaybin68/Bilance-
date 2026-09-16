import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuthService, LoginResult, TwoFaChallengeResult } from './auth.service';
import { AuthTokensDto, LoginDto, RefreshTokenDto } from './dto/login.dto';
import { TwoFactorCompleteDto } from './dto/two-factor.dto';
import {
  TwoFactorSetupResponseDto,
  TwoFactorVerifyDto,
} from './dto/two-factor.dto';
import { JwtAuthGuard, RefreshTokenGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Login (có hỗ trợ 2FA challenge) ─────────────────────────────────────

  /**
   * POST /auth/login
   *
   * Đăng nhập cơ bản: nếu tài khoản không kích hoạt 2FA → trả token ngay.
   * Nếu tài khoản có 2FA (đã kích hoạt HOẶC pending setup) → trả
   *   { requires2FA: true, sessionId: "...", pendingSetup: true/false }
   * Client gửi POST /auth/2fa/verify với TwoFactorCompleteDto
   *   { sessionId, token } để hoàn tất.
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập — trả token hoặc yêu cầu 2FA' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Trả token khi không cần 2FA; ngược lại trả requires2FA + sessionId',
    content: {
      'application/json': {
        schema: {
          oneOf: [
            { $ref: '#/components/schemas/AuthTokensDto' },
            {
              type: 'object',
              properties: {
                requires2FA: { type: 'boolean', example: true },
                sessionId: { type: 'string', example: 'otp-1726030400000-abc123' },
                pendingSetup: { type: 'boolean', example: false },
              },
            },
          ],
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async login(
    @CurrentUser()
    user: AuthenticatedUser & {
      requires2FA: boolean;
      pendingSetup: boolean;
      sessionId: string | null;
    },
  ): Promise<AuthTokensDto | TwoFaChallengeResult> {
    // Nếu user yêu cầu 2FA → trả sessionId + cờ requires2FA + pendingSetup
    if (user.requires2FA) {
      return {
        requires2FA: true,
        sessionId: user.sessionId!,
        pendingSetup: user.pendingSetup,
      } as TwoFaChallengeResult;
    }
    return this.authService.login(user);
  }

  // ─── Token refresh ──────────────────────────────────────────────────────

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gia hạn access token bằng refresh token' })
  @ApiBody({ type: RefreshTokenDto, required: false })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  refresh(@CurrentUser() user: AuthenticatedUser): Promise<AuthTokensDto> {
    return this.authService.refreshToken(user);
  }

  // ─── Profile ──────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thông tin người dùng đang đăng nhập' })
  profile(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  // ─── Two-Factor Authentication ────────────────────────────────────────────

  /**
   * Bước 1 (tùy chọn, cho người dùng đã login): Tạo secret TOTP và trả QR code URL.
   * Người dùng quét QR bằng Google Authenticator / Authy.
   *
   * Sau khi quét, gọi POST /auth/2fa/enable để kích hoạt.
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khởi tạo 2FA — lấy QR code để quét' })
  @ApiOkResponse({ type: TwoFactorSetupResponseDto, description: 'secret + otpauthUrl' })
  setup2FA(@CurrentUser() user: AuthenticatedUser): Promise<TwoFactorSetupResponseDto> {
    return this.authService.setup2FA(user.id, user.email);
  }

  /**
   * Bước 2 (tùy chọn): Xác nhận mã từ Authenticator để kích hoạt 2FA.
   * Body: { token: "123456", secret: "BASE32SECRET" }
   *
   * Secret có thể gửi kèm (nếu client lưu) hoặc dùng secret đã lưu trong DB từ bước setup.
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kích hoạt 2FA sau khi đã quét QR' })
  @ApiBody({
    schema: {
      properties: {
        token: { type: 'string', example: '123456', description: 'Mã 6 chữ số từ app' },
        secret: { type: 'string', description: 'Secret nhận được từ bước setup (không bắt buộc nếu đã lưu)' },
      },
      required: ['token'],
    },
  })
  @ApiOkResponse({ description: 'Xác nhận 2FA đã được bật' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  enable2FA(
    @CurrentUser() user: AuthenticatedUser,
    @Body('token') token: string,
    @Body('secret') secret?: string,
  ): Promise<{ message: string }> {
    return this.authService.enable2FA(user.id, token, secret);
  }

  /**
   * Xác thực mã TOTP khi đăng nhập (dùng sau login khi requires2FA=true).
   *
   * POST /auth/2fa/verify
   * Body: { sessionId: "...", token: "123456" }  (TwoFactorCompleteDto)
   *
   * Không cần JWT — sessionId là cách xác thực duy nhất ở bước này.
   * Nếu token đúng và session hợp lệ → trả accessToken + refreshToken.
   * Nếu user đang pending setup → tự động kích hoạt 2FA.
   */
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hoàn tất đăng nhập 2FA — gửi sessionId + mã TOTP' })
  @ApiBody({ type: TwoFactorCompleteDto })
  @ApiOkResponse({
    description: 'Trả accessToken + refreshToken khi xác thực thành công',
    content: {
      'application/json': {
        schema: {
          allOf: [
            { $ref: '#/components/schemas/AuthTokensDto' },
            {
              type: 'object',
              properties: {
                twoFactorEnabled: { type: 'boolean', example: true },
                pendingSetupResolved: { type: 'boolean', example: false },
              },
            },
          ],
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async verify2FA(
    @Body('sessionId') sessionId: string,
    @Body('token') token: string,
  ): Promise<LoginResult & { twoFactorEnabled: boolean; pendingSetupResolved: boolean }> {
    return this.authService.verify2FA(sessionId, token);
  }

  /**
   * Tắt 2FA sau khi xác thực mã TOTP lần cuối.
   * Yêu cầu JWT (đã login) + mã TOTP hiện tại.
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tắt 2FA sau khi xác thực mã TOTP' })
  @ApiBody({ type: TwoFactorVerifyDto })
  @ApiOkResponse({ description: 'Xác nhận 2FA đã được tắt' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  disable2FA(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TwoFactorVerifyDto,
  ): Promise<{ message: string }> {
    return this.authService.disable2FA(user.id, dto.token);
  }
}
