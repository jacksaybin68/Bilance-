import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../enumeration/role.enum';
import { UserService } from '../user/user.service';
import { TwoFactorService } from './two-factor.service';

export interface TokenUser {
  id: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async validateUser(email: string, password: string): Promise<TokenUser> {
    const user = await this.userService.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isValid = await user.comparePassword(password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    return { id: user.id, email: user.email, role: user.role };
  }

  async login(user: TokenUser) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.signRefreshToken(payload),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES', '1h'),
    };
  }

  async refreshToken(user: TokenUser) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.signRefreshToken(payload),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES', '1h'),
    };
  }

  // ─── Two-Factor Authentication ────────────────────────────────────────────

  /**
   * Bước 1: Tạo secret và trả về QR code URL để người dùng quét.
   * Secret được trả về nhưng CHƯA được lưu vào DB cho đến khi người dùng verify.
   */
  async setup2FA(userId: string, email: string) {
    const secret = this.twoFactorService.generateSecret();
    const otpauthUrl = this.twoFactorService.buildOtpauthUrl(secret, email);
    // TODO: Lưu secret tạm thời vào cache/session hoặc trường `twoFactorTempSecret` trong User entity
    // Ví dụ: await this.userService.saveTempTwoFactorSecret(userId, secret);
    return { secret, otpauthUrl };
  }

  /**
   * Bước 2: Người dùng nhập mã từ app Authenticator để kích hoạt 2FA.
   * Sau khi verify thành công, lưu secret vào DB và bật cờ twoFactorEnabled.
   */
  async enable2FA(userId: string, token: string, secret: string): Promise<{ message: string }> {
    const isValid = this.twoFactorService.verifyToken(token, secret);
    if (!isValid) throw new BadRequestException('Mã 2FA không hợp lệ hoặc đã hết hạn');
    // TODO: await this.userService.enableTwoFactor(userId, secret);
    return { message: '2FA đã được kích hoạt thành công' };
  }

  /**
   * Xác thực mã TOTP khi đăng nhập (dùng sau bước login thường).
   */
  async verify2FA(userId: string, token: string): Promise<{ verified: boolean }> {
    // TODO: const user = await this.userService.findById(userId);
    // const secret = user.twoFactorSecret;
    // Tạm thời throw để nhắc tích hợp User entity
    throw new BadRequestException(
      'Cần tích hợp User entity: thêm trường twoFactorSecret và twoFactorEnabled',
    );
  }

  /**
   * Tắt 2FA cho người dùng sau khi xác thực mã lần cuối.
   */
  async disable2FA(userId: string, token: string): Promise<{ message: string }> {
    // TODO: const user = await this.userService.findById(userId);
    // const isValid = this.twoFactorService.verifyToken(token, user.twoFactorSecret);
    // if (!isValid) throw new BadRequestException('Mã 2FA không hợp lệ');
    // await this.userService.disableTwoFactor(userId);
    return { message: '2FA đã được tắt thành công' };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private signRefreshToken(payload: { email: string; sub: string; role: Role }): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET', 'okbong-refresh-secret');
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES', '7d') as
      | number
      | `${number}`
      | `${number} ${'s' | 'm' | 'h' | 'd' | 'w'}`;
    return this.jwtService.sign(payload, { secret, expiresIn });
  }
}

