import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/**
 * DTO nhận sessionId + mã TOTP 6 chữ số.
 * Dùng ở POST /auth/2fa/verify — bước hoàn tất login khi requires2FA=true.
 *
 * Không cần JWT: sessionId là cách xác thực duy nhất ở bước này.
 */
export class TwoFactorCompleteDto {
  @ApiProperty({
    example: 'otp-1726030400000-abc123',
    description: 'Session ID nhận được từ bước login khi requires2FA=true',
  })
  @IsString()
  sessionId!: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã TOTP 6 chữ số được tạo bởi ứng dụng Authenticator',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: 'Mã 2FA phải đúng 6 chữ số' })
  token!: string;
}

/**
 * DTO nhận mã TOTP 6 chữ số → dùng ở 2fa/enable và 2fa/disable
 * (các endpoint đòi hỏi JWT đã login).
 */
export class TwoFactorVerifyDto {
  @ApiProperty({
    example: '123456',
    description: 'Mã TOTP 6 chữ số được tạo bởi ứng dụng Authenticator',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: 'Mã 2FA phải đúng 6 chữ số' })
  token!: string;
}

/**
 * Response khi bật 2FA thành công — trả về secret và QR code URL
 * để người dùng quét vào ứng dụng Authenticator.
 */
export class TwoFactorSetupResponseDto {
  @ApiProperty({ description: 'Secret TOTP dạng Base32 (lưu an toàn)' })
  secret!: string;

  @ApiProperty({ description: 'URL ảnh QR code (otpauth:// scheme)' })
  otpauthUrl!: string;
}
