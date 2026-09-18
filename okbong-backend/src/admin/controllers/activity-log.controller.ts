import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../enumeration/role.enum';
import { AdminService } from '../admin.service';
import { AdminListQueryDto } from '../dto/admin-query.dto';
import { ActivityLogEntity } from '../entities/activity-log.entity';

@ApiTags('admin/activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/activity')
export class ActivityLogController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Recent activity logs (X-Total-Count header)' })
  @ApiOkResponse({ description: 'Recent activity logs' })
  async recent(
    @Query() query: AdminListQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ActivityLogEntity[]> {
    const limit = query.limit ?? 50;
    const [items, total] = await Promise.all([
      this.adminService.recentActivity(limit),
      this.adminService.dashboardStats().then((stats) => stats.activity),
    ]);
    response.setHeader('X-Total-Count', total);
    return items;
  }
}
