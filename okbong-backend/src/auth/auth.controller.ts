import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';
import { AuthTokensDto, LoginDto, RefreshTokenDto } from './dto/login.dto';
import { JwtAuthGuard, RefreshTokenGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserStatus, UserEntity } from '../user/entity/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange credentials for a token pair' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'accessToken plus refreshToken/expiresIn' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  login(@CurrentUser() user: AuthenticatedUser): Promise<AuthTokensDto> {
    const userEntity: UserEntity = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: '',
      bills: [],
      comparePassword: async () => true,
      hashPassword: async () => {},
    };
    return this.authService.login(userEntity);
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the access token' })
  @ApiBody({ type: RefreshTokenDto, required: false })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  refresh(@CurrentUser() user: AuthenticatedUser): Promise<AuthTokensDto> {
    const userEntity: UserEntity = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: '',
      bills: [],
      comparePassword: async () => true,
      hashPassword: async () => {},
    };
    return this.authService.refreshToken(userEntity);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current authenticated user' })
  profile(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
