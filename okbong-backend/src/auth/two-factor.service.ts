/**
 * TwoFactorService — TOTP (Time-based One-Time Password) theo RFC 6238
 *
 * Triển khai thuần TypeScript, không phụ thuộc thư viện ngoài.
 * Nếu dự án sau này cài `otplib`, chỉ cần thay thế các hàm
 * generateSecret / verifyToken bằng:
 *   import { authenticator } from 'otplib';
 *   authenticator.generateSecret()
 *   authenticator.verify({ token, secret })
 *
 * Thuật toán HMAC-SHA1 chuẩn TOTP (RFC 6238 + RFC 4226).
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';

/** Alphabet Base32 chuẩn RFC 4648 */
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encode một Buffer thành chuỗi Base32.
 */
function encodeBase32(buf: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_CHARS[(value >>> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

/**
 * Decode chuỗi Base32 thành Buffer.
 */
function decodeBase32(input: string): Buffer {
  const str = input.toUpperCase().replace(/=+$/, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const ch of str) {
    const idx = BASE32_CHARS.indexOf(ch);
    if (idx < 0) continue; // bỏ qua ký tự không hợp lệ

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }

  return Buffer.from(bytes);
}

/** Số bước thời gian cho phép lệch (±30 s mỗi bên → window = 1) */
const TOTP_WINDOW = 1;
/** Chu kỳ mã TOTP tính bằng giây */
const TOTP_STEP = 30;
/** Số chữ số của mã OTP */
const TOTP_DIGITS = 6;

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  /**
   * Tạo secret TOTP ngẫu nhiên (20 bytes → Base32, ≈32 ký tự).
   */
  generateSecret(): string {
    const raw = randomBytes(20);
    return encodeBase32(raw);
  }

  /**
   * Tạo URL otpauth:// để hiển thị QR code.
   * Người dùng quét bằng Google Authenticator / Authy / v.v.
   *
   * @param secret  Secret Base32
   * @param email   Email định danh tài khoản
   * @param issuer  Tên ứng dụng (hiển thị trong app Authenticator)
   */
  buildOtpauthUrl(secret: string, email: string, issuer = 'NexTrading'): string {
    const label = encodeURIComponent(`${issuer}:${email}`);
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: String(TOTP_DIGITS),
      period: String(TOTP_STEP),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  /**
   * Sinh mã TOTP cho một bước thời gian cụ thể (HOTP cơ sở).
   *
   * @param secretBase32  Secret Base32
   * @param counter       Số bước thời gian (Math.floor(Date.now()/1000 / 30))
   */
  private generateHOTP(secretBase32: string, counter: number): string {
    const key = decodeBase32(secretBase32);

    // Counter dạng big-endian 8 bytes
    const msg = Buffer.alloc(8);
    let c = counter;
    for (let i = 7; i >= 0; i--) {
      msg[i] = c & 0xff;
      c = Math.floor(c / 256);
    }

    const hmac = createHmac('sha1', key).update(msg).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return String(code % Math.pow(10, TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
  }

  /**
   * Sinh mã TOTP hiện tại (dùng để kiểm thử nội bộ).
   */
  generateToken(secretBase32: string): string {
    const counter = Math.floor(Date.now() / 1000 / TOTP_STEP);
    return this.generateHOTP(secretBase32, counter);
  }

  /**
   * Xác thực mã TOTP do người dùng cung cấp.
   * Cho phép lệch ±TOTP_WINDOW bước (tức ±30 s mỗi bên).
   *
   * @param token         Mã 6 chữ số người dùng nhập
   * @param secretBase32  Secret lưu trong DB
   * @returns true nếu hợp lệ
   */
  verifyToken(token: string, secretBase32: string): boolean {
    if (!/^\d{6}$/.test(token)) return false;

    const counter = Math.floor(Date.now() / 1000 / TOTP_STEP);

    for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
      const expected = this.generateHOTP(secretBase32, counter + delta);
      if (expected === token) {
        this.logger.debug(`TOTP khớp tại delta=${delta}`);
        return true;
      }
    }

    return false;
  }
}
