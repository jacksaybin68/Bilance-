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
import { AuthService } from './auth.service';
import { AuthTokensDto, LoginDto, RefreshTokenDto } from './dto/login.dto';
import { TwoFactorSetupResponseDto, TwoFactorVerifyDto } from './dto/two-factor.dto';
import { JwtAuthGuard, RefreshTokenGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đổi thông tin đăng nhập lấy cặp token' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'accessToken + refreshToken + expiresIn' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  login(@CurrentUser() user: AuthenticatedUser): Promise<AuthTokensDto> {
    return this.authService.login(user);
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gia hạn access token bằng refresh token' })
  @ApiBody({ type: RefreshTokenDto, required: false })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  refresh(@CurrentUser() user: AuthenticatedUser): Promise<AuthTokensDto> {
    return this.authService.refreshToken(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thông tin người dùng đang đăng nhập' })
  profile(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  // ─── Two-Factor Authentication ───────────────────────────────────────────

  /**
   * Bước 1: Tạo secret TOTP và trả QR code URL.
   * Người dùng quét QR bằng Google Authenticator / Authy.
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
   * Bước 2: Xác nhận mã từ Authenticator để kích hoạt 2FA.
   * Body: { token: "123456", secret: "BASE32SECRET" }
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
        secret: { type: 'string', description: 'Secret nhận được từ bước setup' },
      },
      required: ['token', 'secret'],
    },
  })
  @ApiOkResponse({ description: 'Xác nhận 2FA đã được bật' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  enable2FA(
    @CurrentUser() user: AuthenticatedUser,
    @Body('token') token: string,
    @Body('secret') secret: string,
  ): Promise<{ message: string }> {
    return this.authService.enable2FA(user.id, token, secret);
  }

  /**
   * Xác thực mã TOTP (dùng sau login khi tài khoản đã bật 2FA).
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xác thực mã TOTP khi đăng nhập 2FA' })
  @ApiBody({ type: TwoFactorVerifyDto })
  @ApiOkResponse({ description: '{ verified: true }' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  verify2FA(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TwoFactorVerifyDto,
  ): Promise<{ verified: boolean }> {
    return this.authService.verify2FA(user.id, dto.token);
  }
}

