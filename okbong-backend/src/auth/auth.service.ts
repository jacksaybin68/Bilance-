import { BadRequestException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { requireSecret } from '../common/utils/require-secret.util';
import { Role } from '../enumeration/role.enum';
import { UserService } from '../user/user.service';
import { TwoFactorService } from './two-factor.service';
import { OTPSessionService } from './otp-session.service';

export interface TokenUser {
  id: string;
  email: string;
  role: Role;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface TwoFaChallengeResult {
  requires2FA: boolean;
  sessionId: string;
  pendingSetup: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly twoFactorService: TwoFactorService,
    private readonly otpSessionService: OTPSessionService,
  ) {}

  async validateUser(email: string, password: string): Promise<
    TokenUser & { requires2FA: boolean; pendingSetup: boolean; sessionId: string | null }
  > {
    const user = await this.userService.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isValid = await user.comparePassword(password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    // 2FA required khi đã kích hoạt HOẶC đang trong giai đoạn pending setup
    // (có twoFactorSecret nhưng twoFactorEnabled=false)
    const requires2FA = Boolean(user.twoFactorEnabled || user.twoFactorSecret);
    const pendingSetup = Boolean(user.twoFactorSecret && !user.twoFactorEnabled);

    if (!requires2FA) {
      return { id: user.id, email: user.email, role: user.role, requires2FA: false, pendingSetup: false, sessionId: null };
    }

    // Tạo session OTP tạm (TTL 5 phút) để client dùng ở bước 2FA/verify
    const sessionId = this.otpSessionService.createSession(user.id, user.email);
    this.logger.log(`2FA challenge issued for user ${user.id} (pendingSetup=${pendingSetup})`);

    return { id: user.id, email: user.email, role: user.role, requires2FA: true, pendingSetup, sessionId };
  }

  async login(user: TokenUser): Promise<LoginResult> {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.signRefreshToken(payload),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES', '1h'),
    };
  }

  async refreshToken(user: TokenUser): Promise<LoginResult> {
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
  async setup2FA(userId: string, email: string): Promise<{ secret: string; otpauthUrl: string }> {
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
   * Xác thực mã TOTP khi đăng nhập (dùng sau bước login khi requires2FA=true).
   * - Kiểm tra session OTP tồn tại và chưa hết hạn
   * - Nếu user đang pending setup → tự động kích hoạt 2FA sau khi TOTP hợp lệ
   * - Trả accessToken + refreshToken khi xác thực thành công
   */
  async verify2FA(
    sessionId: string,
    token: string,
  ): Promise<LoginResult & { twoFactorEnabled: boolean; pendingSetupResolved: boolean }> {
    // 1. Kiểm tra session OTP
    const session = this.otpSessionService.getSession(sessionId);
    if (!session) {
      throw new BadRequestException('Phiên 2FA không tồn tại hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const user = await this.userService.findOne(session.userId);
    if (!user.twoFactorSecret) {
      throw new BadRequestException('Tài khoản chưa cấu hình 2FA');
    }

    // 2. Xác thực TOTP
    const isValid = this.twoFactorService.verifyToken(token, user.twoFactorSecret);
    if (!isValid) throw new BadRequestException('Mã 2FA không hợp lệ hoặc đã hết hạn');

    // 3. Nếu pending setup → tự động kích hoạt 2FA
    let pendingSetupResolved = false;
    if (user.twoFactorEnabled === false && user.twoFactorSecret) {
      await this.userService.enableTwoFactor(session.userId, user.twoFactorSecret);
      pendingSetupResolved = true;
      this.logger.log(`Auto-enabled 2FA for user ${session.userId} after successful verify`);
    }

    // 4. Xóa session OTP, issue token
    this.otpSessionService.deleteSession(sessionId);

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.signRefreshToken(payload),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES', '1h'),
      twoFactorEnabled: true,
      pendingSetupResolved,
    };
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
    const secret = requireSecret(this.configService, 'JWT_REFRESH_SECRET');
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES', '7d') as
      | number
      | `${number}`
      | `${number} ${'s' | 'm' | 'h' | 'd' | 'w'}`;
    return this.jwtService.sign(payload, { secret, expiresIn });
  }
}
