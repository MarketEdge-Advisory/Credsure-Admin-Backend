import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { DataStoreService } from '../store/data-store.service';
import {
  SaveFinancialContentDto,
  UpdateCalculatorConfigDto,
  UpdateInterestRateDto,
  UpsertTenureDto,
} from './dto/admin-config.dto';

@Injectable()
export class AdminConfigService {
  constructor(private readonly store: DataStoreService) {}

  getFinanceConfig() {
    return {
      interestRate: this.store.interestRate,
      loanTenuresInMonths: this.store.loanTenuresInMonths,
      calculator: this.store.calculatorConfig,
      content: this.store.financialContent,
    };
  }

  updateInterestRate(
    actorId: string,
    actorRole: Role,
    updateInterestRateDto: UpdateInterestRateDto,
  ) {
    const { annualRatePct } = updateInterestRateDto;
    this.store.interestRate = {
      annualRatePct: Number(annualRatePct.toFixed(2)),
      updatedAt: this.store.nowIso(),
    };
    this.store.addLog({
      actorId,
      actorRole,
      action: 'UPDATE_INTEREST_RATE',
      entityType: 'InterestRateConfig',
      metadata: this.store.interestRate,
    });

    return this.store.interestRate;
  }

  addTenure(
    actorId: string,
    actorRole: Role,
    upsertTenureDto: UpsertTenureDto,
  ) {
    const { months } = upsertTenureDto;
    if (this.store.loanTenuresInMonths.includes(months)) {
      throw new BadRequestException('Duplicate tenure is not allowed.');
    }

    this.store.loanTenuresInMonths.push(months);
    this.store.loanTenuresInMonths.sort((a, b) => a - b);
    this.store.addLog({
      actorId,
      actorRole,
      action: 'ADD_LOAN_TENURE',
      entityType: 'LoanTenureOption',
      entityId: String(months),
    });

    return this.store.loanTenuresInMonths;
  }

  updateTenure(
    actorId: string,
    actorRole: Role,
    previousMonths: number,
    upsertTenureDto: UpsertTenureDto,
  ) {
    const { months: newMonths } = upsertTenureDto;

    const index = this.store.loanTenuresInMonths.findIndex(
      (value) => value === previousMonths,
    );
    if (index < 0) {
      throw new NotFoundException('Tenure not found.');
    }

    if (
      this.store.loanTenuresInMonths.some(
        (value, currentIndex) => currentIndex !== index && value === newMonths,
      )
    ) {
      throw new BadRequestException('Duplicate tenure is not allowed.');
    }

    this.store.loanTenuresInMonths[index] = newMonths;
    this.store.loanTenuresInMonths.sort((a, b) => a - b);
    this.store.addLog({
      actorId,
      actorRole,
      action: 'UPDATE_LOAN_TENURE',
      entityType: 'LoanTenureOption',
      entityId: String(newMonths),
      metadata: { previousMonths, newMonths },
    });

    return this.store.loanTenuresInMonths;
  }

  deleteTenure(actorId: string, actorRole: Role, months: number) {
    const index = this.store.loanTenuresInMonths.findIndex(
      (value) => value === months,
    );
    if (index < 0) {
      throw new NotFoundException('Tenure not found.');
    }

    this.store.loanTenuresInMonths.splice(index, 1);
    this.store.addLog({
      actorId,
      actorRole,
      action: 'DELETE_LOAN_TENURE',
      entityType: 'LoanTenureOption',
      entityId: String(months),
    });

    return this.store.loanTenuresInMonths;
  }

  updateCalculatorConfig(
    actorId: string,
    actorRole: Role,
    updateCalculatorConfigDto: UpdateCalculatorConfigDto,
  ) {
    const { downPaymentPct, processingFeePct, insuranceCost } =
      updateCalculatorConfigDto;

    this.store.calculatorConfig = {
      downPaymentPct: Number(downPaymentPct.toFixed(2)),
      processingFeePct: Number(processingFeePct.toFixed(2)),
      insuranceCost: Number(insuranceCost.toFixed(2)),
      updatedAt: this.store.nowIso(),
    };

    this.store.addLog({
      actorId,
      actorRole,
      action: 'UPDATE_CALCULATOR_CONFIG',
      entityType: 'CalculatorConfig',
      metadata: this.store.calculatorConfig,
    });

    return this.store.calculatorConfig;
  }

  saveDraftContent(
    actorId: string,
    actorRole: Role,
    saveFinancialContentDto: SaveFinancialContentDto,
  ) {
    const { title, body, disclaimer } = saveFinancialContentDto;

    this.store.financialContent = {
      ...this.store.financialContent,
      title,
      body,
      disclaimer: disclaimer ?? '',
      status: 'DRAFT',
      updatedAt: this.store.nowIso(),
    };
    this.store.addLog({
      actorId,
      actorRole,
      action: 'SAVE_FINANCIAL_CONTENT_DRAFT',
      entityType: 'FinancialContent',
    });

    return this.store.financialContent;
  }

  publishContent(actorId: string, actorRole: Role) {
    this.store.financialContent = {
      ...this.store.financialContent,
      status: 'PUBLISHED',
      publishedAt: this.store.nowIso(),
      updatedAt: this.store.nowIso(),
    };
    this.store.addLog({
      actorId,
      actorRole,
      action: 'PUBLISH_FINANCIAL_CONTENT',
      entityType: 'FinancialContent',
    });
    return this.store.financialContent;
  }
}
