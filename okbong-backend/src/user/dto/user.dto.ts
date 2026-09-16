import { IsString, IsNumber, IsOptional, MinLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../enumeration/role.enum';
import { UserStatus } from '../entity/user.entity';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @MinLength(3)
  email!: string;

  @ApiProperty({ example: 'securepassword123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.USER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  isActive?: UserStatus;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'newemail@example.com' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  email?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  isActive?: UserStatus;
}

export class LoginUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @MinLength(3)
  email!: string;

  @ApiProperty({ example: 'securepassword123' })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class UserQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
