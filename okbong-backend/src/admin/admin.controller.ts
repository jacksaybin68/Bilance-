import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOkResponse({ description: 'Overall admin dashboard statistics' })
  async stats() {
    const [userStats, walletStats, billStats] = await Promise.all([
      this.adminService.userCount(),
      this.adminService.walletCount(),
      this.adminService.billCount(),
    ]);
    return { users: userStats, wallets: walletStats, bills: billStats };
  }
}
