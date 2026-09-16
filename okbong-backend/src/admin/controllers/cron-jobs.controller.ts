import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../enumeration/role.enum';

@ApiTags('admin/cron')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/cron')
export class CronJobsController {
  @Get()
  @ApiOkResponse({ description: 'Cron job status overview (stub)' })
  async overview() {
    return { stub: true, message: 'Cron jobs endpoint — wire to BullMQ dashboard/scheduler' };
  }
}
