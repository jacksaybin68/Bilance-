import { Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Role } from '../enumeration/role.enum';
import { DepositDto, WalletQueryDto, WalletType, WithdrawDto } from './dto/wallet.dto';
import { TransactionQueryDto } from './dto/transaction.dto';
import { WalletEntity } from './entity/wallet.entity';
import { WalletService } from './wallet.service';

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
}

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'List my wallets' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WalletQueryDto,
  ): Promise<WalletEntity[]> {
    return this.walletService.findByUser(user.id, query.type);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Balance overview of the authenticated user' })
  balance(@CurrentUser() user: AuthenticatedUser): Promise<WalletEntity[]> {
    return this.walletService.findByUser(user.id);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Wallets of a given user (own wallets, or any user for admins)' })
  @ApiOkResponse({ description: 'Wallet list' })
  byUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: WalletQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WalletEntity[]> {
    if (userId !== user.id && !isAdmin(user)) {
      throw new ForbiddenException('Cannot view another user\'s wallets');
    }
    return this.walletService.findByUser(userId, query.type);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deposit into my wallet' })
  deposit(@Body() dto: DepositDto, @CurrentUser() user: AuthenticatedUser): Promise<WalletEntity> {
    return this.walletService.deposit(
      this.resolveSelfOnlyUserId(dto.userId, user),
      dto.amount,
      dto.type ?? WalletType.E_WALLET,
    );
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw from my wallet' })
  withdraw(@Body() dto: WithdrawDto, @CurrentUser() user: AuthenticatedUser): Promise<WalletEntity> {
    return this.walletService.withdraw(
      this.resolveSelfOnlyUserId(dto.userId, user),
      dto.amount,
      dto.type ?? WalletType.E_WALLET,
    );
  }

  @Get(':walletId/transactions')
  @ApiOperation({ summary: 'Transaction history of a wallet (own wallet, or any for admins)' })
  @ApiQuery({ name: 'type', required: false, enum: WalletType })
  @ApiQuery({ name: 'status', required: false })
  @ApiOkResponse({ description: 'Paginated transaction list' })
  async transactionHistory(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Query() query: TransactionQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!isAdmin(user)) {
      const wallet = await this.walletService.findOne(walletId);
      if (wallet.userId !== user.id) {
        throw new ForbiddenException('Cannot view another user\'s transactions');
      }
    }
    return this.walletService.transactionHistory(walletId, query, query.limit ?? 50, query.offset ?? 0);
  }

  /**
   * Balances may only be moved by their owner. Admins have
   * `POST /admin/transactions/adjust` for corrections, which writes a paired
   * ledger row and an activity-log entry; routing them through here would skip
   * that audit trail.
   */
  private resolveSelfOnlyUserId(requested: string | undefined, user: AuthenticatedUser): string {
    if (requested && requested !== user.id) {
      throw new ForbiddenException(
        'Cannot move funds for another user; administrators must use POST /admin/transactions/adjust',
      );
    }
    return user.id;
  }
}
