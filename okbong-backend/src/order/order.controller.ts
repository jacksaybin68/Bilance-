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
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateOrderDto, OrderQueryDto } from './dto/order-query.dto';
import { OrderEntity } from './entity/order.entity';
import { OrderService } from './order.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Place a new order' })
  @ApiCreatedResponse({ description: 'Created order' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser): Promise<OrderEntity> {
    return this.orderService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'My orders' })
  @ApiOkResponse({ description: 'Paginated order list' })
  list(@Query() query: OrderQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.orderService.listForUser(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Order detail (owner or admin)' })
  @ApiOkResponse({ description: 'Order detail' })
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderEntity> {
    return this.orderService.findOneForUser(id, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel one of my orders' })
  @ApiOkResponse({ description: 'Cancelled order' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderEntity> {
    return this.orderService.cancel(id, user);
  }
}