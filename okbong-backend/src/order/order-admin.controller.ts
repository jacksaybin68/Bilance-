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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Role } from '../enumeration/role.enum';
import { AdminSetOrderResultDto, OrderQueryDto } from './dto/order.dto';
import { OrderService } from './order.service';
import { OrderEntity } from './entity/order.entity';

@ApiTags('admin-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/orders')
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả lệnh (admin)' })
  list(@Query() query: OrderQueryDto) {
    return this.orderService.listOrders({
      side: query.side,
      status: query.status,
      userId: query.userId,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một lệnh (admin)' })
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<OrderEntity> {
    return this.orderService.findOne(id);
  }

  @Post(':id/result')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Điều chỉnh kết quả lệnh — win cộng gấp đôi, lose giữ trừ' })
  setResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminSetOrderResultDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<OrderEntity> {
    return this.orderService.setOrderResult(id, dto.result, admin.id, dto.note);
  }
}