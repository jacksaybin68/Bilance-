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
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Role } from '../enumeration/role.enum';
import { AdminCancelOrderDto, AdminOrderResultDto, OrderQueryDto } from './dto/order-query.dto';
import { OrderService } from './order.service';

@ApiTags('admin/orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/orders')
export class OrderManagementController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'All orders with filters (admin only)' })
  @ApiOkResponse({ description: 'Paginated order list across every user' })
  list(@Query() query: OrderQueryDto) {
    return this.orderService.list(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Order counters, side split and filled volume' })
  @ApiOkResponse({ description: 'Aggregated order statistics' })
  stats() {
    return this.orderService.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Order detail (admin only)' })
  @ApiOkResponse({ description: 'Order detail' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.findOne(id);
  }

  @Post(':id/result')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust an order result: status, filled amount and price' })
  @ApiOkResponse({ description: 'Updated order' })
  overrideResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminOrderResultDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.orderService.overrideResult(id, dto, admin.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order on behalf of the platform' })
  @ApiOkResponse({ description: 'Cancelled order' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminCancelOrderDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.orderService.adminCancel(id, admin.id, dto.reason);
  }
}