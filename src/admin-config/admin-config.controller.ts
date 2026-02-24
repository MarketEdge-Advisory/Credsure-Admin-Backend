import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../common/enums/role.enum';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminConfigService } from './admin-config.service';
import {
  SaveFinancialContentDto,
  UpdateCalculatorConfigDto,
  UpdateInterestRateDto,
  UpsertTenureDto,
} from './dto/admin-config.dto';

@UseGuards(AuthGuard, RolesGuard)
@ApiTags('Admin Config')
@ApiBearerAuth()
@Controller('admin-config')
export class AdminConfigController {
  constructor(private readonly adminConfigService: AdminConfigService) {}

  @Roles(Role.CredsureAdmin, Role.SuperAdmin)
  @Get()
  getFinanceConfig() {
    return this.adminConfigService.getFinanceConfig();
  }

  @Roles(Role.CredsureAdmin, Role.SuperAdmin)
  @Patch('interest-rate')
  updateInterestRate(
    @Req() req: RequestWithUser,
    @Body() updateInterestRateDto: UpdateInterestRateDto,
  ) {
    return this.adminConfigService.updateInterestRate(
      req.user!.userId,
      req.user!.role,
      updateInterestRateDto,
    );
  }

  @Roles(Role.CredsureAdmin, Role.SuperAdmin)
  @Post('loan-tenures')
  addTenure(@Req() req: RequestWithUser, @Body() upsertTenureDto: UpsertTenureDto) {
    return this.adminConfigService.addTenure(
      req.user!.userId,
      req.user!.role,
      upsertTenureDto,
    );
  }

  @Roles(Role.CredsureAdmin, Role.SuperAdmin)
  @Patch('loan-tenures/:months')
  updateTenure(
    @Req() req: RequestWithUser,
    @Param('months', ParseIntPipe) months: number,
    @Body() upsertTenureDto: UpsertTenureDto,
  ) {
    return this.adminConfigService.updateTenure(
      req.user!.userId,
      req.user!.role,
      months,
      upsertTenureDto,
    );
  }

  @Roles(Role.CredsureAdmin, Role.SuperAdmin)
  @Delete('loan-tenures/:months')
  deleteTenure(
    @Req() req: RequestWithUser,
    @Param('months', ParseIntPipe) months: number,
  ) {
    return this.adminConfigService.deleteTenure(
      req.user!.userId,
      req.user!.role,
      months,
    );
  }

  @Roles(Role.CredsureAdmin, Role.SuperAdmin)
  @Patch('calculator')
  updateCalculator(
    @Req() req: RequestWithUser,
    @Body() updateCalculatorConfigDto: UpdateCalculatorConfigDto,
  ) {
    return this.adminConfigService.updateCalculatorConfig(
      req.user!.userId,
      req.user!.role,
      updateCalculatorConfigDto,
    );
  }

  @Roles(Role.CredsureAdmin, Role.SuperAdmin)
  @Patch('content/draft')
  saveDraft(
    @Req() req: RequestWithUser,
    @Body() saveFinancialContentDto: SaveFinancialContentDto,
  ) {
    return this.adminConfigService.saveDraftContent(
      req.user!.userId,
      req.user!.role,
      saveFinancialContentDto,
    );
  }

  @Roles(Role.CredsureAdmin, Role.SuperAdmin)
  @Post('content/publish')
  publish(@Req() req: RequestWithUser) {
    return this.adminConfigService.publishContent(
      req.user!.userId,
      req.user!.role,
    );
  }
}
