import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@gmail.com' })
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
  @ApiProperty({ required: false, description: 'Refresh JWT (also accepted as Bearer)' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
