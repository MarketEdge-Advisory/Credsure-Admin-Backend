import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinanceApplicationsController } from './finance-applications.controller';
import { FinanceApplicationsService } from './finance-applications.service';

@Module({
  imports: [PrismaModule],
  controllers: [FinanceApplicationsController],
  providers: [FinanceApplicationsService],
  exports: [FinanceApplicationsService],
})
export class FinanceApplicationsModule {}
