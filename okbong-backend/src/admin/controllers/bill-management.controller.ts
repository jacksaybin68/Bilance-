import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../enumeration/role.enum';
import { AdminService } from '../admin.service';

@ApiTags('admin/bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/bills')
export class BillManagementController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOkResponse({ description: 'Bill summary statistics' })
  async billStats() {
    return this.adminService.billCount();
  }
}
