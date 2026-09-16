import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/**
 * DTO nhận mã TOTP 6 chữ số do người dùng nhập vào.
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
