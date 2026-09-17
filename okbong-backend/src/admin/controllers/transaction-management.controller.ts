import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '../../enumeration/role.enum';
import {
  AdminTransactionQueryDto,
  RejectTransactionDto,
  ReverseTransactionDto,
  WalletAdjustmentDto,
} from '../dto/transaction-management.dto';
import { TransactionManagementService } from '../services/transaction-management.service';

@ApiTags('admin/transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/transactions')
export class TransactionManagementController {
  constructor(private readonly transactionService: TransactionManagementService) {}

  @Get()
  @ApiOperation({ summary: 'User transactions with filters (admin only)' })
  @ApiOkResponse({ description: 'Paginated transaction list including owner email and wallet' })
  list(@Query() query: AdminTransactionQueryDto) {
    return this.transactionService.list(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Transaction counters and settled deposit/withdraw totals' })
  @ApiOkResponse({ description: 'Aggregated transaction statistics' })
  stats() {
    return this.transactionService.stats();
  }

  @Get('pending-count')
  @ApiOperation({ summary: 'Count of transactions awaiting review' })
  @ApiOkResponse({ description: 'Pending transaction count' })
  async pendingCount(): Promise<{ pending: number }> {
    return { pending: await this.transactionService.pendingCount() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Transaction detail with owner and wallet (admin only)' })
  @ApiOkResponse({ description: 'Transaction detail' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionService.findOne(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending transaction and settle the wallet' })
  @ApiOkResponse({ description: 'Updated transaction' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectTransactionDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.transactionService.approve(id, admin.id, dto.reason);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending transaction' })
  @ApiOkResponse({ description: 'Updated transaction' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectTransactionDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.transactionService.reject(id, admin.id, dto.reason);
  }

  @Post(':id/reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverse a settled transaction and undo the balance change' })
  @ApiOkResponse({ description: 'Updated transaction' })
  reverse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseTransactionDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.transactionService.reverse(id, admin.id, dto.reason);
  }

  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually adjust a wallet balance (always audited)' })
  @ApiOkResponse({ description: 'Updated wallet plus the adjustment ledger row' })
  adjust(
    @Body() dto: WalletAdjustmentDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.transactionService.adjustWallet(dto, admin.id);
  }
}