import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../enumeration/role.enum';

@ApiTags('admin/cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/cards')
export class CardManagementController {
  /**
   * No card model exists in the backend yet, so this reports the empty state
   * instead of fabricated rows. Replace with a CardEntity query when cards land.
   */
  @Get()
  @ApiOperation({ summary: 'Card list (empty until a card model is added)' })
  @ApiOkResponse({ description: 'Empty card collection — no card model exists yet' })
  listCards(): { items: unknown[]; total: number; implemented: boolean } {
    return { items: [], total: 0, implemented: false };
  }
}