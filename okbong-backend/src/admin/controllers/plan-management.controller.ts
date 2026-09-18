import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../enumeration/role.enum';
import { AdminService } from '../admin.service';
import { CreatePlanDto, UpdatePlanDto } from '../dto/admin-query.dto';
import { PlanEntity } from '../entities/plan.entity';

@ApiTags('admin/plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/plans')
export class PlanManagementController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'List every subscription plan' })
  list(): Promise<PlanEntity[]> {
    return this.adminService.listPlans();
  }

  @Post()
  @ApiOkResponse({ description: 'The created plan' })
  create(@Body() dto: CreatePlanDto): Promise<PlanEntity> {
    return this.adminService.createPlan(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a plan' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto): Promise<PlanEntity> {
    return this.adminService.updatePlan(id, dto);
  }
}
