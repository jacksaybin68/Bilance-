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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DepositDto, WalletQueryDto, WalletType, WithdrawDto } from './dto/wallet.dto';
import { WalletEntity } from './entity/wallet.entity';
import { WalletService } from './wallet.service';

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
  @ApiOperation({ summary: 'Wallets of a given user' })
  @ApiOkResponse({ description: 'Wallet list' })
  byUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: WalletQueryDto,
  ): Promise<WalletEntity[]> {
    return this.walletService.findByUser(userId, query.type);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deposit into a wallet' })
  deposit(@Body() dto: DepositDto, @CurrentUser() user: AuthenticatedUser): Promise<WalletEntity> {
    return this.walletService.deposit(
      dto.userId ?? user.id,
      dto.amount,
      dto.type ?? WalletType.E_WALLET,
    );
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw from a wallet' })
  withdraw(@Body() dto: WithdrawDto, @CurrentUser() user: AuthenticatedUser): Promise<WalletEntity> {
    return this.walletService.withdraw(
      dto.userId ?? user.id,
      dto.amount,
      dto.type ?? WalletType.E_WALLET,
    );
  }
}
