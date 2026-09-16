import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@okbong.com' })
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ required: false })
  @IsString()
  refreshToken!: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
