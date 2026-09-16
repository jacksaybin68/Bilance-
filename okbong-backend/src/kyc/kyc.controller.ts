import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiCreatedResponse, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../enumeration/role.enum';
import { KycService } from './kyc.service';
import { CreateKycDto, KycStatusUpdateDto, KycQueryDto } from './dto/kyc.dto';
import { KycEntity, KYCStatus } from './entities/kyc.entity';

@ApiTags('kyc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new KYC application' })
  @ApiCreatedResponse({ description: 'KYC submission created' })
  async submit(@Body() dto: CreateKycDto): Promise<KycEntity> {
    return this.kycService.create(dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user\'s KYC status' })
  @ApiOkResponse({ description: 'User KYC record or null' })
  async myKyc(@Body() _body: unknown): Promise<KycEntity | null> {
    // TODO: inject authenticated user; placeholder
    return null;
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List KYC submissions (admin only)' })
  @ApiOkResponse({ description: 'Paginated KYC list' })
  async list(@Query() query: KycQueryDto): Promise<KycEntity[]> {
    return this.kycService.list(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get KYC by ID (admin only)' })
  @ApiOkResponse({ description: 'KYC record' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<KycEntity> {
    return this.kycService.findOne(id);
  }

  @Post(':id/status')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update KYC status (admin only)' })
  @ApiOkResponse({ description: 'Updated KYC record' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KycStatusUpdateDto,
  ): Promise<KycEntity> {
    // TODO: inject reviewer ID from request user
    return this.kycService.updateStatus(id, dto, 'system');
  }
}
