import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { BillQueryDto, CreateUserBillDto } from './dto/bill.dto';
import { BillEntity } from './entity/bill.entity';
import { BillService } from './bill.service';

/** User-facing bills API consumed by okbong-user-frontend (`/bill`). */
@ApiTags('bill')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bill')
export class UserBillController {
  constructor(private readonly billService: BillService) {}

  @Get()
  @ApiOperation({ summary: 'List my bills (paginated, X-Total-Count header)' })
  async findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BillQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BillEntity[]> {
    const { items, total } = await this.billService.findAll({ ...query, userId: user.id });
    response.setHeader('X-Total-Count', total);
    return items;
  }

  @Get(':id')
  @ApiOkResponse({ description: 'A single bill owned by the current user' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BillEntity> {
    return this.billService.findOneForUser(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a bill for the current user' })
  @ApiCreatedResponse({ description: 'The created bill' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserBillDto,
  ): Promise<BillEntity> {
    return this.billService.create({
      userId: user.id,
      amount: dto.amount,
      type: dto.type,
      description: dto.description ?? dto.content,
    });
  }
}
