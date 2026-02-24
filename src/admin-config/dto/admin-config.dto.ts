import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateInterestRateDto {
  @ApiProperty({ example: 7.5 })
  @IsNumber()
  @Min(0.01)
  @Max(100)
  annualRatePct: number;
}

export class UpsertTenureDto {
  @ApiProperty({ example: 36 })
  @IsInt()
  @Min(1)
  months: number;
}

export class UpdateCalculatorConfigDto {
  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  @Max(100)
  downPaymentPct: number;

  @ApiProperty({ example: 2.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  processingFeePct: number;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0)
  insuranceCost: number;
}

export class SaveFinancialContentDto {
  @ApiProperty({ example: 'Vehicle Financing Overview' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Configure rich-text financial information here.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    example: 'Rates and terms are subject to final approval.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  disclaimer?: string;
}
