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
   * Secret được lưu tạm vào User entity (twoFactorSecret) nhưng
   * twoFactorEnabled vẫn=false cho đến khi người dùng verify thành công.
   */
  async setup2FA(userId: string, email: string) {
    const secret = this.twoFactorService.generateSecret();
    const otpauthUrl = this.twoFactorService.buildOtpauthUrl(secret, email);
    await this.userService.saveTempTwoFactorSecret(userId, secret);
    return { secret, otpauthUrl };
  }

  /**
   * Bước 2: Người dùng nhập mã từ app Authenticator để kích hoạt 2FA.
   * Ưu tiên secret đã lưu tạm trong DB; nếu chưa có thì dùng secret gửi kèm.
   */
  async enable2FA(userId: string, token: string, secret?: string): Promise<{ message: string }> {
    const user = await this.userService.findOne(userId);
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA đã được kích hoạt trước đó');
    }

    const storedSecret = user.twoFactorSecret ?? secret;
    if (!storedSecret) throw new BadRequestException('Chưa thực hiện bước setup 2FA');

    const isValid = this.twoFactorService.verifyToken(token, storedSecret);
    if (!isValid) throw new BadRequestException('Mã 2FA không hợp lệ hoặc đã hết hạn');

    await this.userService.enableTwoFactor(userId, storedSecret);
    return { message: '2FA đã được kích hoạt thành công' };
  }

  /**
   * Xác thực mã TOTP khi đăng nhập (dùng sau bước login thường).
   */
  async verify2FA(userId: string, token: string): Promise<{ verified: boolean }> {
    const user = await this.userService.findOne(userId);
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Tài khoản chưa kích hoạt 2FA');
    }

    const isValid = this.twoFactorService.verifyToken(token, user.twoFactorSecret);
    if (!isValid) throw new BadRequestException('Mã 2FA không hợp lệ hoặc đã hết hạn');

    return { verified: true };
  }

  /**
   * Tắt 2FA cho người dùng sau khi xác thực mã lần cuối.
   */
  async disable2FA(userId: string, token: string): Promise<{ message: string }> {
    const user = await this.userService.findOne(userId);
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Tài khoản chưa kích hoạt 2FA');
    }

    const isValid = this.twoFactorService.verifyToken(token, user.twoFactorSecret);
    if (!isValid) throw new BadRequestException('Mã 2FA không hợp lệ');

    await this.userService.disableTwoFactor(userId);
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

