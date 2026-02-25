import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import {
  CreateFinanceApplicationDto,
  FinanceApplicationListQueryDto,
  UpdateFinanceApplicationStatusDto,
} from './dto/finance-applications.dto';
import { FinanceApplicationsService } from './finance-applications.service';

@ApiTags('Finance Applications')
@Controller()
export class FinanceApplicationsController {
  constructor(
    private readonly financeApplicationsService: FinanceApplicationsService,
  ) {}

  @Post('public/finance-applications')
  submit(@Body() createFinanceApplicationDto: CreateFinanceApplicationDto) {
    return this.financeApplicationsService.submitApplication(
      createFinanceApplicationDto,
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.CredsureAdmin, Role.SuzukiAdmin, Role.SuperAdmin)
  @ApiBearerAuth()
  @Get('finance-applications')
  list(@Query() query: FinanceApplicationListQueryDto) {
    return this.financeApplicationsService.getApplications(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.CredsureAdmin, Role.SuzukiAdmin, Role.SuperAdmin)
  @ApiBearerAuth()
  @Patch('finance-applications/:applicationId/status')
  updateStatus(
    @Req() req: RequestWithUser,
    @Param('applicationId') applicationId: string,
    @Body()
    updateFinanceApplicationStatusDto: UpdateFinanceApplicationStatusDto,
  ) {
    return this.financeApplicationsService.updateApplicationStatus(
      req.user!.userId,
      req.user!.role,
      applicationId,
      updateFinanceApplicationStatusDto,
    );
  }
}
