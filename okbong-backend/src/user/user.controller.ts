import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
  forwardRef,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { AuthTokensDto } from '../auth/dto/login.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Role } from '../enumeration/role.enum';
import { CreateUserDto, LoginUserDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { UserEntity } from './entity/user.entity';
import { UserService } from './user.service';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'The created user (password hash excluded)' })
  create(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.userService.create(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login (legacy alias of /auth/login)' })
  async login(@Body() loginUserDto: LoginUserDto): Promise<AuthTokensDto> {
    const user = await this.authService.validateUser(loginUserDto.email, loginUserDto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user profile' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserEntity> {
    return this.userService.findOne(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users (paginated, X-Total-Count header)' })
  async findAll(
    @Query() query: UserQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserEntity[]> {
    const { items, total } = await this.userService.findAll(query);
    response.setHeader('X-Total-Count', total);
    return items;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'A single user' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserEntity> {
    return this.userService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.userService.update(id, updateUserDto);
  }
}
