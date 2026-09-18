import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '../../enumeration/role.enum';
import { AdminService } from '../admin.service';
import {
  AdminCreateUserDto,
  AdminUpdateRoleDto,
  AdminUpdateUserDto,
  AdminUserQueryDto,
} from '../dto/admin-query.dto';
import { UserEntity } from '../../user/entity/user.entity';

@ApiTags('admin/users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/users')
export class UserManagementController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated list of users (X-Total-Count header)' })
  @ApiOkResponse({ description: 'Paginated list of users' })
  async listUsers(
    @Query() query: AdminUserQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserEntity[]> {
    const { items, total } = await this.adminService.listUsers(query);
    response.setHeader('X-Total-Count', total);
    return items;
  }

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  create(
    @Body() dto: AdminCreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserEntity> {
    return this.adminService.createUser(dto, actor);
  }

  @Get('stats')
  @ApiOperation({ summary: 'User summary statistics' })
  userStats() {
    return this.adminService.userCount();
  }

  @Get(':id')
  @ApiOperation({ summary: 'A single user' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserEntity> {
    return this.adminService.findUser(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserEntity> {
    return this.adminService.updateUser(id, dto, actor);
  }

  @Post(':id/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban a user' })
  ban(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.adminService.banUser(id, actor);
  }

  @Post(':id/unban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unban a user' })
  unban(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.adminService.unbanUser(id, actor);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Change a user role' })
  changeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.adminService.changeUserRole(id, dto.role, actor);
  }
}
