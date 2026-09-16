import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../enumeration/role.enum';
import { AdminService } from '../admin.service';

@ApiTags('admin/wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/wallets')
export class WalletManagementController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOkResponse({ description: 'Wallet summary statistics' })
  async walletStats() {
    return this.adminService.walletCount();
  }
}
