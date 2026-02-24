import { Role } from '../common/enums/role.enum';

export interface AdminUserRecord {
  id: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface InterestRateConfigRecord {
  annualRatePct: number;
  updatedAt: string;
}

export interface CalculatorConfigRecord {
  downPaymentPct: number;
  processingFeePct: number;
  insuranceCost: number;
  updatedAt: string;
}

export interface FinancialContentRecord {
  title: string;
  body: string;
  disclaimer: string;
  status: 'DRAFT' | 'PUBLISHED';
  updatedAt: string;
  publishedAt: string | null;
}

export interface CarImageRecord {
  id: string;
  url: string;
  position: number;
}

export interface CarSpecificationRecord {
  engine: string;
  transmission: string;
  fuelType: string;
}

export interface CarRecord {
  id: string;
  name: string;
  category: string;
  modelYear: number;
  basePrice: number;
  variant: string;
  description: string;
  availability: 'AVAILABLE' | 'OUT_OF_STOCK';
  isFeatured: boolean;
  specs: CarSpecificationRecord;
  images: CarImageRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogRecord {
  id: string;
  actorId: string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: unknown;
  createdAt: string;
}
