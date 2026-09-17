import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../enumeration/role.enum';
import { ActivityLogService } from '../services/activity-log.service';

@ApiTags('admin/activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/activity')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOkResponse({ description: 'Recent activity logs' })
  async recent(@Query('limit') limit?: string) {
    const parsed = Number(limit);
    return this.activityLogService.recent(Number.isFinite(parsed) && parsed > 0 ? parsed : 50);
  }
}
