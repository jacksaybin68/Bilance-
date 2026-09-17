import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateOrderDto, OrderQueryDto } from './dto/order.dto';
import { OrderService } from './order.service';
import { OrderEntity } from './entity/order.entity';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đặt lệnh — trừ điểm ngay; admin xác nhận kết quả sau' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderEntity> {
    return this.orderService.createOrder(user.id, {
      pair: dto.pair,
      side: dto.side,
      amount: dto.amount,
      price: dto.price ?? 0,
      type: dto.type,
    });
  }

  @Get('mine')
  @ApiOperation({ summary: 'Danh sách lệnh của tôi' })
  mine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrderQueryDto,
  ) {
    return this.orderService.listMine(user.id, {
      side: query.side,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một lệnh (chỉ chủ sở hữu hoặc admin)' })
  async detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderEntity> {
    const order = await this.orderService.findOne(id);
    if (order.userId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xem lệnh này');
    }
    return order;
  }
}