import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CarsService } from '../cars/cars.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carsService: CarsService,
  ) {}

  @Get('finance')
  async getFinanceConfig() {
    const [interestRate, loanTenures, calculatorConfig, financialContent] =
      await this.prisma.$transaction([
        this.prisma.interestRateConfig.findFirst({
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.loanTenureOption.findMany({
          where: { isPublished: true },
          orderBy: { months: 'asc' },
        }),
        this.prisma.calculatorConfig.findFirst({
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.financialContent.findFirst({
          where: { status: 'PUBLISHED' },
          orderBy: { updatedAt: 'desc' },
        }),
      ]);

    return {
      interestRate: interestRate
        ? {
            annualRatePct: Number(interestRate.annualRatePct),
            updatedAt: interestRate.updatedAt.toISOString(),
          }
        : null,
      loanTenuresInMonths: loanTenures.map((item) => item.months),
      calculatorConfig: calculatorConfig
        ? {
            downPaymentPct: Number(calculatorConfig.downPaymentPct),
            processingFeePct: Number(calculatorConfig.processingFeePct),
            insuranceCost: Number(calculatorConfig.insuranceCost),
            updatedAt: calculatorConfig.updatedAt.toISOString(),
          }
        : null,
      financialContent: financialContent
        ? {
            title: financialContent.title,
            body: financialContent.body,
            disclaimer: financialContent.disclaimer ?? '',
            status: financialContent.status,
            updatedAt: financialContent.updatedAt.toISOString(),
            publishedAt: financialContent.publishedAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  @Get('cars')
  getCars() {
    return this.carsService.getCars();
  }
}
