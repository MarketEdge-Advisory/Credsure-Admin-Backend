import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import {
  InterestRateHistoryQueryDto,
  SaveFinancialContentDto,
  UpdateCalculatorConfigDto,
  UpdateInterestRateDto,
  UpsertTenureDto,
} from './dto/admin-config.dto';

@Injectable()
export class AdminConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getFinanceConfig() {
    const interestRateConfig = await this.getOrCreateInterestRateConfig();
    const loanTenures = await this.prisma.loanTenureOption.findMany({
      where: { isPublished: true },
      orderBy: { months: 'asc' },
    });
    const calculatorConfig = await this.getOrCreateCalculatorConfig();
    const financialContent = await this.getOrCreateFinancialContent();

    return {
      interestRate: {
        annualRatePct: Number(interestRateConfig.annualRatePct),
        updatedAt: interestRateConfig.updatedAt.toISOString(),
      },
      loanTenuresInMonths: loanTenures.map((item) => item.months),
      calculator: {
        downPaymentPct: Number(calculatorConfig.downPaymentPct),
        processingFeePct: Number(calculatorConfig.processingFeePct),
        insuranceCost: Number(calculatorConfig.insuranceCost),
        updatedAt: calculatorConfig.updatedAt.toISOString(),
      },
      content: {
        title: financialContent.title,
        body: financialContent.body,
        disclaimer: financialContent.disclaimer ?? '',
        status: financialContent.status,
        updatedAt: financialContent.updatedAt.toISOString(),
        publishedAt: financialContent.publishedAt?.toISOString() ?? null,
      },
    };
  }

  async getInterestRateHistory(query: InterestRateHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.interestRateHistory.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          previousRatePct: true,
          newRatePct: true,
          changedById: true,
          changedByRole: true,
          createdAt: true,
          changedBy: {
            select: {
              email: true,
            },
          },
        },
      }),
      this.prisma.interestRateHistory.count(),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        previousRatePct:
          item.previousRatePct === null ? null : Number(item.previousRatePct),
        newRatePct: Number(item.newRatePct),
        changedById: item.changedById,
        changedByRole: item.changedByRole,
        changedByEmail: item.changedBy?.email ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateInterestRate(
    actorId: string,
    actorRole: Role,
    updateInterestRateDto: UpdateInterestRateDto,
  ) {
    const { annualRatePct } = updateInterestRateDto;

    const normalizedRate = Number(annualRatePct.toFixed(2));

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.interestRateConfig.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      const previousRatePct = existing ? Number(existing.annualRatePct) : null;

      const updated = existing
        ? await tx.interestRateConfig.update({
            where: { id: existing.id },
            data: { annualRatePct: normalizedRate.toFixed(2) },
          })
        : await tx.interestRateConfig.create({
            data: { annualRatePct: normalizedRate.toFixed(2) },
          });

      await tx.interestRateHistory.create({
        data: {
          previousRatePct:
            previousRatePct === null ? null : previousRatePct.toFixed(2),
          newRatePct: normalizedRate.toFixed(2),
          changedById: actorId,
          changedByRole: actorRole,
        },
      });

      await tx.activityLog.create({
        data: {
          actorId,
          actorRole,
          action: 'UPDATE_INTEREST_RATE',
          entityType: 'InterestRateConfig',
          entityId: updated.id,
          metadata: {
            previousRatePct,
            newRatePct: normalizedRate,
          },
        },
      });

      return updated;
    });

    return {
      annualRatePct: Number(result.annualRatePct),
      updatedAt: result.updatedAt.toISOString(),
    };
  }

  addTenure(
    actorId: string,
    actorRole: Role,
    upsertTenureDto: UpsertTenureDto,
  ) {
    return this.addTenureInternal(actorId, actorRole, upsertTenureDto);
  }

  private async addTenureInternal(
    actorId: string,
    actorRole: Role,
    upsertTenureDto: UpsertTenureDto,
  ) {
    const { months } = upsertTenureDto;
    const existing = await this.prisma.loanTenureOption.findUnique({
      where: { months },
      select: { id: true, isPublished: true },
    });
    if (existing?.isPublished) {
      throw new BadRequestException('Duplicate tenure is not allowed.');
    }

    if (existing) {
      await this.prisma.loanTenureOption.update({
        where: { id: existing.id },
        data: { isPublished: true },
      });
    } else {
      await this.prisma.loanTenureOption.create({
        data: { months, isPublished: true },
      });
    }

    await this.prisma.activityLog.create({
      data: {
        actorId,
        actorRole,
        action: 'ADD_LOAN_TENURE',
        entityType: 'LoanTenureOption',
        entityId: String(months),
      },
    });

    const tenures = await this.prisma.loanTenureOption.findMany({
      where: { isPublished: true },
      orderBy: { months: 'asc' },
      select: { months: true },
    });
    return tenures.map((item) => item.months);
  }

  updateTenure(
    actorId: string,
    actorRole: Role,
    previousMonths: number,
    upsertTenureDto: UpsertTenureDto,
  ) {
    return this.updateTenureInternal(
      actorId,
      actorRole,
      previousMonths,
      upsertTenureDto,
    );
  }

  private async updateTenureInternal(
    actorId: string,
    actorRole: Role,
    previousMonths: number,
    upsertTenureDto: UpsertTenureDto,
  ) {
    const { months: newMonths } = upsertTenureDto;

    const existing = await this.prisma.loanTenureOption.findFirst({
      where: { months: previousMonths, isPublished: true },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Tenure not found.');
    }

    if (newMonths !== previousMonths) {
      const duplicate = await this.prisma.loanTenureOption.findFirst({
        where: { months: newMonths, isPublished: true },
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestException('Duplicate tenure is not allowed.');
      }
    }

    try {
      await this.prisma.loanTenureOption.update({
        where: { id: existing.id },
        data: { months: newMonths },
      });
    } catch {
      throw new BadRequestException('Duplicate tenure is not allowed.');
    }

    await this.prisma.activityLog.create({
      data: {
        actorId,
        actorRole,
        action: 'UPDATE_LOAN_TENURE',
        entityType: 'LoanTenureOption',
        entityId: String(newMonths),
        metadata: { previousMonths, newMonths },
      },
    });

    const tenures = await this.prisma.loanTenureOption.findMany({
      where: { isPublished: true },
      orderBy: { months: 'asc' },
      select: { months: true },
    });
    return tenures.map((item) => item.months);
  }

  async deleteTenure(actorId: string, actorRole: Role, months: number) {
    const existing = await this.prisma.loanTenureOption.findFirst({
      where: { months, isPublished: true },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Tenure not found.');
    }

    await this.prisma.loanTenureOption.update({
      where: { id: existing.id },
      data: { isPublished: false },
    });
    await this.prisma.activityLog.create({
      data: {
        actorId,
        actorRole,
        action: 'DELETE_LOAN_TENURE',
        entityType: 'LoanTenureOption',
        entityId: String(months),
      },
    });

    const tenures = await this.prisma.loanTenureOption.findMany({
      where: { isPublished: true },
      orderBy: { months: 'asc' },
      select: { months: true },
    });
    return tenures.map((item) => item.months);
  }

  updateCalculatorConfig(
    actorId: string,
    actorRole: Role,
    updateCalculatorConfigDto: UpdateCalculatorConfigDto,
  ) {
    return this.updateCalculatorConfigInternal(
      actorId,
      actorRole,
      updateCalculatorConfigDto,
    );
  }

  private async updateCalculatorConfigInternal(
    actorId: string,
    actorRole: Role,
    updateCalculatorConfigDto: UpdateCalculatorConfigDto,
  ) {
    const { downPaymentPct, processingFeePct, insuranceCost } =
      updateCalculatorConfigDto;
    const existing = await this.prisma.calculatorConfig.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    const updated = existing
      ? await this.prisma.calculatorConfig.update({
          where: { id: existing.id },
          data: {
            downPaymentPct: downPaymentPct.toFixed(2),
            processingFeePct: processingFeePct.toFixed(2),
            insuranceCost: insuranceCost.toFixed(2),
          },
        })
      : await this.prisma.calculatorConfig.create({
          data: {
            downPaymentPct: downPaymentPct.toFixed(2),
            processingFeePct: processingFeePct.toFixed(2),
            insuranceCost: insuranceCost.toFixed(2),
          },
        });

    await this.prisma.activityLog.create({
      data: {
        actorId,
        actorRole,
        action: 'UPDATE_CALCULATOR_CONFIG',
        entityType: 'CalculatorConfig',
        metadata: {
          downPaymentPct: Number(updated.downPaymentPct),
          processingFeePct: Number(updated.processingFeePct),
          insuranceCost: Number(updated.insuranceCost),
        },
      },
    });

    return {
      downPaymentPct: Number(updated.downPaymentPct),
      processingFeePct: Number(updated.processingFeePct),
      insuranceCost: Number(updated.insuranceCost),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  saveDraftContent(
    actorId: string,
    actorRole: Role,
    saveFinancialContentDto: SaveFinancialContentDto,
  ) {
    return this.saveDraftContentInternal(actorId, actorRole, saveFinancialContentDto);
  }

  private async saveDraftContentInternal(
    actorId: string,
    actorRole: Role,
    saveFinancialContentDto: SaveFinancialContentDto,
  ) {
    const { title, body, disclaimer } = saveFinancialContentDto;
    const existing = await this.prisma.financialContent.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    const updated = existing
      ? await this.prisma.financialContent.update({
          where: { id: existing.id },
          data: {
            title,
            body,
            disclaimer: disclaimer ?? '',
            status: 'DRAFT',
          },
        })
      : await this.prisma.financialContent.create({
          data: {
            title,
            body,
            disclaimer: disclaimer ?? '',
            status: 'DRAFT',
          },
        });

    await this.prisma.activityLog.create({
      data: {
        actorId,
        actorRole,
        action: 'SAVE_FINANCIAL_CONTENT_DRAFT',
        entityType: 'FinancialContent',
      },
    });

    return {
      title: updated.title,
      body: updated.body,
      disclaimer: updated.disclaimer ?? '',
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
      publishedAt: updated.publishedAt?.toISOString() ?? null,
    };
  }

  async publishContent(actorId: string, actorRole: Role) {
    const existing = await this.prisma.financialContent.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Financial content not found.');
    }

    const updated = await this.prisma.financialContent.update({
      where: { id: existing.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    await this.prisma.activityLog.create({
      data: {
        actorId,
        actorRole,
        action: 'PUBLISH_FINANCIAL_CONTENT',
        entityType: 'FinancialContent',
      },
    });

    return {
      title: updated.title,
      body: updated.body,
      disclaimer: updated.disclaimer ?? '',
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
      publishedAt: updated.publishedAt?.toISOString() ?? null,
    };
  }

  private async getOrCreateInterestRateConfig() {
    const existing = await this.prisma.interestRateConfig.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.interestRateConfig.create({
      data: { annualRatePct: '5.50', isPublished: true },
    });
  }

  private async getOrCreateCalculatorConfig() {
    const existing = await this.prisma.calculatorConfig.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.calculatorConfig.create({
      data: {
        downPaymentPct: '20.00',
        processingFeePct: '2.50',
        insuranceCost: '100000.00',
        isPublished: true,
      },
    });
  }

  private async getOrCreateFinancialContent() {
    const existing = await this.prisma.financialContent.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.financialContent.create({
      data: {
        title: 'Vehicle Financing Overview',
        body: 'Configure rich-text financial information here.',
        disclaimer: 'Rates and terms are subject to final approval.',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  }
}
