import { Controller, Get, UseGuards } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../enumeration/role.enum';

export interface CronJobOverview {
  name: string;
  type: 'cron' | 'interval' | 'timeout';
  schedule: string;
  lastRun: string | null;
  nextRun: string | null;
}

@ApiTags('admin/cron')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/cron')
export class CronJobsController {
  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  @Get()
  @ApiOperation({ summary: 'Registered scheduled job overview' })
  @ApiOkResponse({ description: 'Every cron/interval/timeout job registered with the scheduler' })
  overview(): { jobs: CronJobOverview[] } {
    const jobs: CronJobOverview[] = [];

    for (const [name, job] of this.schedulerRegistry.getCronJobs()) {
      jobs.push({
        name,
        type: 'cron',
        schedule: String(job.cronTime.source),
        lastRun: safeDate(job.lastDate() as Date | null),
        nextRun: safeDate(job.nextDate().toJSDate()),
      });
    }

    for (const name of this.schedulerRegistry.getIntervals()) {
      jobs.push({
        name,
        type: 'interval',
        schedule: `${this.schedulerRegistry.getInterval(name)}ms`,
        lastRun: null,
        nextRun: null,
      });
    }

    for (const name of this.schedulerRegistry.getTimeouts()) {
      jobs.push({
        name,
        type: 'timeout',
        schedule: `${this.schedulerRegistry.getTimeout(name)}ms`,
        lastRun: null,
        nextRun: null,
      });
    }

    return { jobs };
  }
}

function safeDate(value: Date | null | undefined): string | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null;
}
