import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '../../enumeration/role.enum';
import { AdminService } from '../admin.service';
import { UpdateSettingsDto } from '../dto/admin-query.dto';
import { SystemSettingEntity } from '../entities/system-setting.entity';

@ApiTags('admin/settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Current system settings (super admin only)' })
  @ApiOkResponse({ description: 'Key/value system settings' })
  getSettings(): Promise<SystemSettingEntity[]> {
    return this.adminService.listSettings();
  }

  @Put()
  @ApiOperation({ summary: 'Update system settings (super admin only)' })
  updateSettings(@Body() dto: UpdateSettingsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.adminService.updateSettings(dto.settings, actor);
  }
}