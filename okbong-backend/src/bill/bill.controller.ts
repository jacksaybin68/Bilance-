import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../enumeration/role.enum';
import { BillQueryDto, CreateBillDto, UpdateBillDto } from './dto/bill.dto';
import { BillEntity } from './entity/bill.entity';
import { BillService } from './bill.service';

@ApiTags('bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('bills')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Get()
  @ApiOperation({ summary: 'List bills (paginated, X-Total-Count header)' })
  async findAll(
    @Query() query: BillQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BillEntity[]> {
    const { items, total } = await this.billService.findAll(query);
    response.setHeader('X-Total-Count', total);
    return items;
  }

  @Get(':id')
  @ApiOkResponse({ description: 'A single bill' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BillEntity> {
    return this.billService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a bill' })
  @ApiCreatedResponse({ description: 'The created bill' })
  create(@Body() dto: CreateBillDto): Promise<BillEntity> {
    return this.billService.create({
      userId: dto.userId,
      amount: dto.amount,
      type: dto.type,
      description: dto.description,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bill status/description' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBillDto): Promise<BillEntity> {
    return this.billService.update(id, { status: dto.status, description: dto.description });
  }
}
