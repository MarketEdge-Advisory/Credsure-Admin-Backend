import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CarSpecsDto {
  @ApiProperty({ example: '2.0L Turbo' })
  @IsString()
  @IsNotEmpty()
  engine: string;

  @ApiProperty({ example: 'Automatic' })
  @IsString()
  @IsNotEmpty()
  transmission: string;

  @ApiProperty({ example: 'Petrol' })
  @IsString()
  @IsNotEmpty()
  fuelType: string;
}

export class CarImageInputDto {
  @ApiProperty({ example: 'https://cdn.example.com/cars/swift/front.jpg' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\.(jpg|jpeg|png)$/i, {
    message: 'url must end in .jpg, .jpeg, or .png',
  })
  url: string;
}

export class CreateCarDto {
  @ApiProperty({ example: 'Suzuki Swift' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Hatchback' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(1990)
  modelYear: number;

  @ApiProperty({ example: 18500000 })
  @IsNumber()
  @Min(0.01)
  basePrice: number;

  @ApiPropertyOptional({ example: 'GLX' })
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiPropertyOptional({ example: 'Compact hatchback with premium interior.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ['AVAILABLE', 'NOT_AVAILABLE', 'COMING_SOON'],
    example: 'AVAILABLE',
  })
  @IsOptional()
  @IsIn(['AVAILABLE', 'NOT_AVAILABLE', 'COMING_SOON'])
  availability?: 'AVAILABLE' | 'NOT_AVAILABLE' | 'COMING_SOON';

  @ApiProperty({ type: CarSpecsDto })
  @ValidateNested()
  @Type(() => CarSpecsDto)
  specs: CarSpecsDto;

  @ApiPropertyOptional({ type: [CarImageInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CarImageInputDto)
  images?: CarImageInputDto[];
}

export class UpdateCarDto {
  @ApiPropertyOptional({ example: 'Suzuki Swift' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'Hatchback' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @IsInt()
  @Min(1990)
  modelYear?: number;

  @ApiPropertyOptional({ example: 18500000 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  basePrice?: number;

  @ApiPropertyOptional({ example: 'GLX' })
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: CarSpecsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarSpecsDto)
  specs?: CarSpecsDto;
}

export class UpdateCarPriceDto {
  @ApiProperty({ example: 19250000 })
  @IsNumber()
  @Min(0.01)
  basePrice: number;
}

export class UpsertCarImagesDto {
  @ApiProperty({ type: [CarImageInputDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CarImageInputDto)
  images: CarImageInputDto[];
}

export class ReorderImagesDto {
  @ApiProperty({
    type: [String],
    example: [
      '3f14a7f2-7938-4c46-97a4-86b5d8edec30',
      'aa4ec042-8616-4ce9-a7da-26d5b2be03fe',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  imageIds: string[];
}

export class ToggleAvailabilityDto {
  @ApiProperty({
    enum: ['AVAILABLE', 'NOT_AVAILABLE', 'COMING_SOON'],
    example: 'AVAILABLE',
  })
  @IsIn(['AVAILABLE', 'NOT_AVAILABLE', 'COMING_SOON'])
  availability: 'AVAILABLE' | 'NOT_AVAILABLE' | 'COMING_SOON';
}

export class ToggleFeaturedDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isFeatured: boolean;
}
