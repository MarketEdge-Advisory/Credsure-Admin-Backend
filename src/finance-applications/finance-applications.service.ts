import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFinanceApplicationDto,
  FinanceApplicationListQueryDto,
  UpdateFinanceApplicationStatusDto,
} from './dto/finance-applications.dto';

@Injectable()
export class FinanceApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async submitApplication(
    createFinanceApplicationDto: CreateFinanceApplicationDto,
  ) {
    const {
      fullName,
      phoneNumber,
      email,
      employmentStatus,
      estimatedNetMonthlyIncome,
      carId,
      selectedVehicle,
      vehicleAmount,
      downPayment,
      monthlyPayment,
      consentGiven,
    } = createFinanceApplicationDto;

    let selectedVehicleValue = selectedVehicle?.trim() || null;
    let vehicleAmountValue =
      vehicleAmount !== undefined ? vehicleAmount.toFixed(2) : null;

    if (carId) {
      const car = await this.prisma.car.findUnique({
        where: { id: carId },
        select: { id: true, name: true, variant: true, basePrice: true },
      });
      if (!car) {
        throw new BadRequestException('Car not found.');
      }

      if (!selectedVehicleValue) {
        selectedVehicleValue = car.variant
          ? `${car.name} ${car.variant}`
          : car.name;
      }
      if (vehicleAmountValue === null) {
        vehicleAmountValue = car.basePrice.toString();
      }
    }

    const created = await this.prisma.financeApplication.create({
      data: {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim().toLowerCase(),
        employmentStatus: employmentStatus.trim(),
        estimatedNetMonthlyIncome: estimatedNetMonthlyIncome.toFixed(2),
        carId: carId || null,
        selectedVehicle: selectedVehicleValue,
        vehicleAmount: vehicleAmountValue,
        downPayment: downPayment !== undefined ? downPayment.toFixed(2) : null,
        monthlyPayment:
          monthlyPayment !== undefined ? monthlyPayment.toFixed(2) : null,
        consentGiven,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        action: 'CREATE_FINANCE_APPLICATION',
        entityType: 'FinanceApplication',
        entityId: created.id,
        metadata: {
          email: created.email,
          employmentStatus: created.employmentStatus,
          status: created.status,
        },
      },
    });

    try {
      await this.mailService.sendFinanceApplicationNotification({
        to: created.email,
        fullName: created.fullName,
        email: created.email,
      });
    } catch (error) {
      console.error(
        'Failed to send finance application confirmation email to customer:',
        error,
      );
    }

    return this.mapApplication(created);
  }

  async getApplications(query: FinanceApplicationListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = query.status ? { status: query.status } : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.financeApplication.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.financeApplication.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapApplication(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateApplicationStatus(
    actorId: string,
    actorRole: Role,
    applicationId: string,
    updateFinanceApplicationStatusDto: UpdateFinanceApplicationStatusDto,
  ) {
    const existing = await this.prisma.financeApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException('Finance application not found.');
    }

    const updated = await this.prisma.financeApplication.update({
      where: { id: applicationId },
      data: { status: updateFinanceApplicationStatusDto.status },
    });

    await this.prisma.activityLog.create({
      data: {
        actorId,
        actorRole,
        action: 'UPDATE_FINANCE_APPLICATION_STATUS',
        entityType: 'FinanceApplication',
        entityId: updated.id,
        metadata: {
          previousStatus: existing.status,
          newStatus: updated.status,
        },
      },
    });

    return this.mapApplication(updated);
  }

  private mapApplication(item: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    employmentStatus: string;
    estimatedNetMonthlyIncome: unknown;
    carId: string | null;
    selectedVehicle: string | null;
    vehicleAmount: unknown;
    downPayment: unknown;
    monthlyPayment: unknown;
    status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
    consentGiven: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      fullName: item.fullName,
      phoneNumber: item.phoneNumber,
      email: item.email,
      employmentStatus: item.employmentStatus,
      estimatedNetMonthlyIncome: Number(item.estimatedNetMonthlyIncome),
      carId: item.carId,
      selectedVehicle: item.selectedVehicle,
      vehicleAmount:
        item.vehicleAmount === null ? null : Number(item.vehicleAmount),
      downPayment: item.downPayment === null ? null : Number(item.downPayment),
      monthlyPayment:
        item.monthlyPayment === null ? null : Number(item.monthlyPayment),
      status: item.status,
      consentGiven: item.consentGiven,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
