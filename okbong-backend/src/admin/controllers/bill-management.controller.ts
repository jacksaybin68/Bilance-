import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../enumeration/role.enum';
import { AdminService } from '../admin.service';
import { AdminListQueryDto } from '../dto/admin-query.dto';
import { BillEntity } from '../../bill/entity/bill.entity';

@ApiTags('admin/bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/bills')
export class BillManagementController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated list of bills (X-Total-Count header)' })
  async list(
    @Query() query: AdminListQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BillEntity[]> {
    const { items, total } = await this.adminService.listBills(query);
    response.setHeader('X-Total-Count', total);
    return items;
  }

  @Get('stats')
  @ApiOkResponse({ description: 'Bill summary statistics' })
  billStats() {
    return this.adminService.billCount();
  }
}
