import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '../../enumeration/role.enum';
import { AdminService } from '../admin.service';
import { AdminListQueryDto, ReviewTransactionDto } from '../dto/admin-query.dto';
import { TransactionEntity } from '../../wallet/entity/transaction.entity';

@ApiTags('admin/payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/payments')
export class PaymentManagementController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated payment / transaction history (X-Total-Count header)' })
  async list(
    @Query() query: AdminListQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TransactionEntity[]> {
    const { items, total } = await this.adminService.listTransactions(query);
    response.setHeader('X-Total-Count', total);
    return items;
  }

  @Get('stats')
  @ApiOkResponse({ description: 'Transaction count' })
  async stats() {
    const { total } = await this.adminService.listTransactions({ page: 1, limit: 1 });
    return { total };
  }

  @Put(':id/review')
  @ApiOperation({ summary: 'Approve / reject a pending transaction' })
  @ApiOkResponse({ description: 'The reviewed transaction' })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewTransactionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<TransactionEntity> {
    return this.adminService.reviewTransaction(id, dto.status, dto.description, actor);
  }
}
