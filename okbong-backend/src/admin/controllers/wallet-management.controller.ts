import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../enumeration/role.enum';
import { AdminService } from '../admin.service';
import { AdminListQueryDto } from '../dto/admin-query.dto';
import { WalletEntity } from '../../wallet/entity/wallet.entity';

@ApiTags('admin/wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/wallets')
export class WalletManagementController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated list of every wallet (X-Total-Count header)' })
  async list(
    @Query() query: AdminListQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<WalletEntity[]> {
    const { items, total } = await this.adminService.listWallets(query);
    response.setHeader('X-Total-Count', total);
    return items;
  }

  @Get('stats')
  @ApiOkResponse({ description: 'Wallet summary statistics' })
  walletStats() {
    return this.adminService.walletCount();
  }
}
