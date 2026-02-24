import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CarsService } from '../cars/cars.service';
import { DataStoreService } from '../store/data-store.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly store: DataStoreService,
    private readonly carsService: CarsService,
  ) {}

  @Get('finance')
  getFinanceConfig() {
    return {
      interestRate: this.store.interestRate,
      loanTenuresInMonths: this.store.loanTenuresInMonths,
      calculatorConfig: this.store.calculatorConfig,
      financialContent:
        this.store.financialContent.status === 'PUBLISHED'
          ? this.store.financialContent
          : null,
    };
  }

  @Get('cars')
  getCars() {
    return this.carsService.getCars();
  }
}
