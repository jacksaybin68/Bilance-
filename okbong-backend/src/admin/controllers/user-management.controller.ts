import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../enumeration/role.enum';
import { AdminService } from '../admin.service';
import { UserManagementQueryDto, UserManagementPaginationDto } from '../dto/user-management.dto';
import { PaginatedResult } from '../dto/paginated.dto';
import { UserEntity } from '../../user/entity/user.entity';

@ApiTags('admin/users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/users')
export class UserManagementController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of users (admin only)' })
  async listUsers(
    @Query() query: UserManagementQueryDto & UserManagementPaginationDto,
  ): Promise<PaginatedResult<UserEntity>> {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    // placeholder — refine with full query builder when needed
    const where: Record<string, unknown> = {};
    // status filter handled via enum; for now stub

    const [items, total] = await Promise.all([
      // stub: delegate to user service when available
      Promise.resolve([] as UserEntity[]),
      Promise.resolve(0),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
