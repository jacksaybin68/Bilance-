import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '../../enumeration/role.enum';
import { AdminService } from '../admin.service';
import { AdminListQueryDto, CreateContentPostDto, UpdateContentPostDto } from '../dto/admin-query.dto';
import { ContentPostEntity } from '../entities/content-post.entity';

@ApiTags('admin/content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/content')
export class ContentManagementController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'List CMS posts (X-Total-Count header)' })
  async list(
    @Query() query: AdminListQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ContentPostEntity[]> {
    const { items, total } = await this.adminService.listPosts(query);
    response.setHeader('X-Total-Count', total);
    return items;
  }

  @Post()
  @ApiOkResponse({ description: 'The created post' })
  create(
    @Body() dto: CreateContentPostDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ContentPostEntity> {
    return this.adminService.createPost(dto, actor);
  }

  @Put(':id')
  @ApiOkResponse({ description: 'The updated post' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentPostDto,
  ): Promise<ContentPostEntity> {
    return this.adminService.updatePost(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a CMS post' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ deleted: true }> {
    await this.adminService.deletePost(id);
    return { deleted: true };
  }
}