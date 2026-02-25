import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateFinanceApplicationDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Salaried' })
  @IsString()
  @IsNotEmpty()
  employmentStatus: string;

  @ApiProperty({ example: 450000 })
  @IsNumber()
  @Min(0)
  estimatedNetMonthlyIncome: number;

  @ApiPropertyOptional({ example: 'Suzuki Swift' })
  @IsOptional()
  @IsString()
  selectedVehicle?: string;

  @ApiPropertyOptional({ example: 'cm8x9nq3a0001x8b3x2j5n6v7' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  carId?: string;

  @ApiPropertyOptional({ example: 25000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vehicleAmount?: number;

  @ApiPropertyOptional({ example: 2500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  downPayment?: number;

  @ApiPropertyOptional({ example: 1229167 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPayment?: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  consentGiven: boolean;
}

export class FinanceApplicationListQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
    example: 'PENDING',
  })
  @IsOptional()
  @IsIn(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'])
  status?: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
}

export class UpdateFinanceApplicationStatusDto {
  @ApiProperty({
    enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
    example: 'UNDER_REVIEW',
  })
  @IsIn(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'])
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
}
