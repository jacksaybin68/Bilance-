import { Injectable, Logger } from '@nestjs/common';

interface OTPSession {
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

@Injectable()
export class OTPSessionService {
  private readonly logger = new Logger(OTPSessionService.name);
  private readonly sessions = new Map<string, OTPSession>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 phút

  /**
   * Tạo session OTP tạm cho bước xác thực 2FA.
   * Trả về sessionId để client gửi cùng mã TOTP.
   */
  createSession(userId: string, email: string): string {
    const sessionId = `otp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    this.sessions.set(sessionId, {
      userId,
      email,
      createdAt: now,
      expiresAt: now + this.TTL_MS,
    });
    this.logger.log(`OTP session created: ${sessionId} for user ${userId}`);
    return sessionId;
  }

  /**
   * Lấy session OTP, trả null nếu hết hạn hoặc không tồn tại.
   */
  getSession(sessionId: string): OTPSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  /**
   * Xóa session sau khi xác thực thành công hoặc hết hạn.
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Dọn bộ nhớ: loại bỏ session hết hạn.
   */
  pruneExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
      }
    }
  }
}
