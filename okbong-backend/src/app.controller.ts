import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppInfo, AppService, HealthStatus } from './app.service';

@ApiTags('NexTrading')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Service metadata' })
  @ApiOkResponse({ description: 'Basic information about the running API' })
  getInfo(): AppInfo {
    return this.appService.getInfo();
  }

  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'Current health of the API process' })
  getHealth(): HealthStatus {
    return this.appService.getHealth();
  }
}
