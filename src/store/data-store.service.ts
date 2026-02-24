import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Role } from '../common/enums/role.enum';
import {
  ActivityLogRecord,
  AdminUserRecord,
  CalculatorConfigRecord,
  CarRecord,
  FinancialContentRecord,
  InterestRateConfigRecord,
} from './store.types';

@Injectable()
export class DataStoreService {
  public users: AdminUserRecord[] = [];

  public interestRate: InterestRateConfigRecord = {
    annualRatePct: 5.5,
    updatedAt: new Date().toISOString(),
  };

  public loanTenuresInMonths: number[] = [12, 24, 36, 48, 60];

  public calculatorConfig: CalculatorConfigRecord = {
    downPaymentPct: 20,
    processingFeePct: 2.5,
    insuranceCost: 100000,
    updatedAt: new Date().toISOString(),
  };

  public financialContent: FinancialContentRecord = {
    title: 'Vehicle Financing Overview',
    body: 'Configure rich-text financial information here.',
    disclaimer: 'Rates and terms are subject to final approval.',
    status: 'PUBLISHED',
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  };

  public cars: CarRecord[] = [];

  public activityLogs: ActivityLogRecord[] = [];

  generateId(): string {
    return randomUUID();
  }

  nowIso(): string {
    return new Date().toISOString();
  }

  addLog(log: Omit<ActivityLogRecord, 'id' | 'createdAt'>): ActivityLogRecord {
    const created: ActivityLogRecord = {
      ...log,
      id: this.generateId(),
      createdAt: this.nowIso(),
    };
    this.activityLogs.unshift(created);
    return created;
  }

  canManageFinance(role: Role): boolean {
    return role === Role.CredsureAdmin || role === Role.SuperAdmin;
  }

  canManageCars(role: Role): boolean {
    return role === Role.SuzukiAdmin || role === Role.SuperAdmin;
  }
}
