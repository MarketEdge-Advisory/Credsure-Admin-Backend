import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FinanceApplicationsController } from './finance-applications.controller';
import { FinanceApplicationsService } from './finance-applications.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [FinanceApplicationsController],
  providers: [FinanceApplicationsService],
  exports: [FinanceApplicationsService],
})
export class FinanceApplicationsModule {}
