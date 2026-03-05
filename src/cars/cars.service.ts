import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Express } from 'express';
import * as XLSX from 'xlsx';
import { CarAvailability } from '../generated/prisma/client';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CarImageView, CarSpecView, CarView } from './cars.types';
import {
  CreateCarDto,
  ReorderImagesDto,
  ToggleAvailabilityDto,
  ToggleFeaturedDto,
  UpdateCarDto,
  UpdateCarPriceDto,
  UpsertCarImagesDto,
} from './dto/cars.dto';

type ImportValidationError = {
  row: number;
  errors: string[];
};

type ImportValidationResult = {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  expectedColumns: string[];
  errors: ImportValidationError[];
};

type ParsedImportRow = Record<string, unknown>;
type ImportConfirmResult = {
  success: boolean;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
};

@Injectable()
export class CarsService {
  private readonly importColumns = [
    'name',
    'description',
    'price',
    'variant',
    'numberOfUnits',
    'engine',
    'transmission',
    'availability',
  ] as const;

  private readonly headerAliases: Record<string, string> = {
    nameofmodel: 'name',
    specifications: 'description',
    pricengn: 'price',
    variant: 'variant',
    numberofunits: 'numberOfUnits',
    noofunits: 'numberOfUnits',
    enginecapacity: 'engine',
    transmission: 'transmission',
    stockavailability: 'availability',

    name: 'name',
    description: 'description',
    baseprice: 'price',
    price: 'price',
    engine: 'engine',
    availability: 'availability',
  };

  private readonly requiredImportColumns = [
    'name',
    'engine',
    'transmission',
    'availability',
  ] as const;

  constructor(private readonly prisma: PrismaService) {}

  async validateImportSheet(
    file?: Express.Multer.File,
  ): Promise<ImportValidationResult> {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }

    const rows = this.parseImportFile(file);
    const normalizedRows = rows
      .map((row) => this.normalizeRowKeys(row))
      .filter((row) => !this.isEmptyRow(row));

    if (!normalizedRows.length) {
      throw new BadRequestException('File has no data rows.');
    }

    this.validateHeaders(normalizedRows[0]);

    const errors: ImportValidationError[] = [];

    normalizedRows.forEach((row, index) => {
      const rowErrors = this.validateImportRow(row);
      if (rowErrors.length) {
        errors.push({
          row: index + 2,
          errors: rowErrors,
        });
      }
    });

    const invalidRows = errors.length;
    const totalRows = normalizedRows.length;
    const validRows = totalRows - invalidRows;

    return {
      isValid: invalidRows === 0,
      totalRows,
      validRows,
      invalidRows,
      expectedColumns: [...this.importColumns],
      errors,
    };
  }

  async confirmImport(
    file?: Express.Multer.File,
  ): Promise<ImportConfirmResult> {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }

    const rows = this.parseImportFile(file);
    const normalizedRows = rows
      .map((row) => this.normalizeRowKeys(row))
      .filter((row) => !this.isEmptyRow(row))
      .filter((row) => this.asNonEmptyString(row.name) !== null);

    if (!normalizedRows.length) {
      throw new BadRequestException('File has no data rows.');
    }

    this.validateHeaders(normalizedRows[0]);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of normalizedRows) {
      const rowErrors = this.validateImportRow(row);
      if (rowErrors.length) {
        skipped++;
        continue;
      }

      const name = this.asNonEmptyString(row.name)!;
      const description = this.asOptionalString(row.description);
      const basePrice = this.asPriceNumber(row.price);
      const variant = this.asOptionalString(row.variant);
      const numberOfUnits = row.numberOfUnits
        ? Number(row.numberOfUnits)
        : null;
      const engine = this.asNonEmptyString(row.engine)!;
      const transmission = this.asNonEmptyString(row.transmission)!;
      const availability = this.normalizeAvailability(row.availability)!;

      const existing = await this.prisma.car.findFirst({
        where: { name },
      });

      if (existing) {
        await this.prisma.$transaction(async (tx) => {
          await tx.car.update({
            where: { id: existing.id },
            data: {
              description,
              basePrice: basePrice ?? undefined,
              variant,
              numberOfUnits: numberOfUnits ?? undefined,
              availability,
            },
          });

          await tx.carSpecification.deleteMany({
            where: { carId: existing.id },
          });

          await tx.carSpecification.create({
            data: {
              carId: existing.id,
              engine,
              transmission,
              fuelType: '',
            },
          });
        });
        updated++;
      } else {
        await this.prisma.car.create({
          data: {
            name,
            category: 'Uncategorized',
            modelYear: new Date().getFullYear(),
            description,
            basePrice: basePrice ?? 0,
            variant,
            numberOfUnits: numberOfUnits ?? 0,
            availability,
            specifications: {
              create: {
                engine,
                transmission,
                fuelType: '',
              },
            },
          },
        });
        created++;
      }
    }

    return {
      success: true,
      totalRows: normalizedRows.length,
      created,
      updated,
      skipped,
    };
  }

  private validateImportRow(row: ParsedImportRow): string[] {
    const errors: string[] = [];

    if (!this.asNonEmptyString(row.name)) {
      errors.push('name is required.');
    }

    const basePriceRaw = this.asOptionalString(row.price);
    if (basePriceRaw !== null) {
      const basePrice = this.asPriceNumber(basePriceRaw);
      if (basePrice === null || basePrice <= 0) {
        errors.push(
          'price must be a valid positive amount (e.g., 18500000 or 18.5M).',
        );
      }
    }

    const unitsRaw = this.asOptionalString(row.numberOfUnits);
    if (unitsRaw !== null) {
      const units = this.asNumber(unitsRaw);
      if (units === null || !Number.isInteger(units)) {
        errors.push('numberOfUnits must be a whole number.');
      } else if (units < 0) {
        errors.push('numberOfUnits must be 0 or greater.');
      }
    }

    const availability = this.normalizeAvailability(row.availability);
    if (!availability) {
      errors.push(
        'availability must be: Available, Not Available, or Coming Soon.',
      );
    }

    if (!this.asNonEmptyString(row.engine)) {
      errors.push('engine is required.');
    }

    if (!this.asNonEmptyString(row.transmission)) {
      errors.push('transmission is required.');
    }

    return errors;
  }

  async getCars() {
    const cars = await this.prisma.car.findMany({
      include: {
        images: { orderBy: { position: 'asc' } },
        specifications: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return cars.map((car) => this.mapCarRecord(car));
  }

  async getCarById(carId: string) {
    const car = await this.findCar(carId);
    return this.mapCarRecord(car);
  }

  async createCar(
    actorId: string,
    actorRole: Role,
    createCarDto: CreateCarDto,
  ) {
    const {
      name,
      category,
      modelYear,
      basePrice,
      numberOfUnits,
      variant,
      description,
      availability,
      specs,
      images,
    } = createCarDto;

    const created = await this.prisma.car.create({
      data: {
        name: name.trim(),
        category: category?.trim() || 'Uncategorized',
        modelYear: modelYear ?? new Date().getFullYear(),
        basePrice: (basePrice ?? 0).toFixed(2),
        numberOfUnits: numberOfUnits ?? 0,
        variant: variant?.trim() || null,
        description: description?.trim() || null,
        availability: availability ?? 'AVAILABLE',
        specifications: {
          create: {
            engine: specs.engine.trim(),
            transmission: specs.transmission.trim(),
            fuelType: specs.fuelType?.trim() || '',
          },
        },
        images: images?.length
          ? {
              create: images.map((image, index) => ({
                imageUrl: image.url.trim(),
                position: index + 1,
              })),
            }
          : undefined,
      },
      include: {
        images: { orderBy: { position: 'asc' } },
        specifications: true,
      },
    });

    await this.addLog({
      actorId,
      actorRole,
      action: 'CREATE_CAR',
      entityType: 'Car',
      entityId: created.id,
      metadata: {
        name: created.name,
        category: created.category,
        modelYear: created.modelYear,
        basePrice: Number(created.basePrice),
        numberOfUnits: created.numberOfUnits,
      },
    });

    return this.mapCarRecord(created);
  }

  async updateCar(
    actorId: string,
    actorRole: Role,
    carId: string,
    updateCarDto: UpdateCarDto,
  ) {
    const {
      name,
      category,
      modelYear,
      basePrice,
      numberOfUnits,
      variant,
      description,
      specs,
    } = updateCarDto;

    await this.findCar(carId);

    await this.prisma.$transaction(async (tx) => {
      await tx.car.update({
        where: { id: carId },
        data: {
          name: name?.trim(),
          category: category?.trim(),
          modelYear,
          basePrice: basePrice !== undefined ? basePrice.toFixed(2) : undefined,
          numberOfUnits,
          variant: variant !== undefined ? variant.trim() || null : undefined,
          description:
            description !== undefined ? description.trim() || null : undefined,
        },
      });

      if (specs) {
        await tx.carSpecification.deleteMany({ where: { carId } });
        await tx.carSpecification.create({
          data: {
            carId,
            engine: specs.engine.trim(),
            transmission: specs.transmission.trim(),
            fuelType: specs.fuelType?.trim() || '',
          },
        });
      }
    });

    const updated = await this.findCar(carId);

    await this.addLog({
      actorId,
      actorRole,
      action: 'UPDATE_CAR',
      entityType: 'Car',
      entityId: carId,
    });
    return this.mapCarRecord(updated);
  }

  async updatePrice(
    actorId: string,
    actorRole: Role,
    carId: string,
    updateCarPriceDto: UpdateCarPriceDto,
  ) {
    const { basePrice } = updateCarPriceDto;

    await this.findCar(carId);

    const updated = await this.prisma.car.update({
      where: { id: carId },
      data: { basePrice: basePrice.toFixed(2) },
      include: {
        images: { orderBy: { position: 'asc' } },
        specifications: true,
      },
    });

    await this.addLog({
      actorId,
      actorRole,
      action: 'UPDATE_CAR_PRICE',
      entityType: 'Car',
      entityId: updated.id,
      metadata: { basePrice: Number(updated.basePrice) },
    });

    return this.mapCarRecord(updated);
  }

  async upsertImages(
    actorId: string,
    actorRole: Role,
    carId: string,
    upsertCarImagesDto: UpsertCarImagesDto,
  ) {
    const { images: imageInputs } = upsertCarImagesDto;

    await this.findCar(carId);

    await this.prisma.$transaction(async (tx) => {
      await tx.carImage.deleteMany({ where: { carId } });
      await tx.carImage.createMany({
        data: imageInputs.map((image, index) => ({
          carId,
          imageUrl: image.url.trim(),
          position: index + 1,
        })),
      });
    });

    const images = await this.getImagesForCar(carId);

    await this.addLog({
      actorId,
      actorRole,
      action: 'UPSERT_CAR_IMAGES',
      entityType: 'CarImage',
      entityId: carId,
      metadata: { imageCount: images.length },
    });

    return images;
  }

  async deleteImage(
    actorId: string,
    actorRole: Role,
    carId: string,
    imageId: string,
  ) {
    await this.findCar(carId);

    const existing = await this.prisma.carImage.findFirst({
      where: { id: imageId, carId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Image not found.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.carImage.delete({ where: { id: imageId } });

      const remaining = await tx.carImage.findMany({
        where: { carId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });

      for (let i = 0; i < remaining.length; i += 1) {
        await tx.carImage.update({
          where: { id: remaining[i].id },
          data: { position: i + 1 },
        });
      }
    });

    const images = await this.getImagesForCar(carId);

    await this.addLog({
      actorId,
      actorRole,
      action: 'DELETE_CAR_IMAGE',
      entityType: 'CarImage',
      entityId: imageId,
      metadata: { carId },
    });

    return images;
  }

  async reorderImages(
    actorId: string,
    actorRole: Role,
    carId: string,
    reorderImagesDto: ReorderImagesDto,
  ) {
    const { imageIds = [] } = reorderImagesDto;

    await this.findCar(carId);

    const current = await this.prisma.carImage.findMany({
      where: { carId },
      orderBy: { position: 'asc' },
      select: { id: true },
    });

    if (imageIds.length !== current.length) {
      throw new BadRequestException(
        'imageIds length must match current image count.',
      );
    }

    if (new Set(imageIds).size !== imageIds.length) {
      throw new BadRequestException('Duplicate image id in reorder payload.');
    }

    const currentIdSet = new Set(current.map((image) => image.id));
    for (const id of imageIds) {
      if (!currentIdSet.has(id)) {
        throw new BadRequestException(`Unknown image id: ${id}`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < imageIds.length; i += 1) {
        await tx.carImage.update({
          where: { id: imageIds[i] },
          data: { position: i + 1000 },
        });
      }

      for (let i = 0; i < imageIds.length; i += 1) {
        await tx.carImage.update({
          where: { id: imageIds[i] },
          data: { position: i + 1 },
        });
      }
    });

    const images = await this.getImagesForCar(carId);

    await this.addLog({
      actorId,
      actorRole,
      action: 'REORDER_CAR_IMAGES',
      entityType: 'CarImage',
      entityId: carId,
    });

    return images;
  }

  async toggleAvailability(
    actorId: string,
    actorRole: Role,
    carId: string,
    toggleAvailabilityDto: ToggleAvailabilityDto,
  ) {
    const { availability } = toggleAvailabilityDto;

    await this.findCar(carId);

    const updated = await this.prisma.car.update({
      where: { id: carId },
      data: { availability },
      include: {
        images: { orderBy: { position: 'asc' } },
        specifications: true,
      },
    });

    await this.addLog({
      actorId,
      actorRole,
      action: 'TOGGLE_CAR_AVAILABILITY',
      entityType: 'Car',
      entityId: updated.id,
      metadata: { availability: updated.availability },
    });

    return this.mapCarRecord(updated);
  }

  async toggleFeatured(
    actorId: string,
    actorRole: Role,
    carId: string,
    toggleFeaturedDto: ToggleFeaturedDto,
  ) {
    const { isFeatured } = toggleFeaturedDto;

    await this.findCar(carId);

    const updated = await this.prisma.car.update({
      where: { id: carId },
      data: { isFeatured },
      include: {
        images: { orderBy: { position: 'asc' } },
        specifications: true,
      },
    });

    await this.addLog({
      actorId,
      actorRole,
      action: 'TOGGLE_CAR_FEATURED',
      entityType: 'Car',
      entityId: updated.id,
      metadata: { isFeatured: updated.isFeatured },
    });

    return this.mapCarRecord(updated);
  }

  async deleteCar(actorId: string, actorRole: Role, carId: string) {
    await this.findCar(carId);

    const removed = await this.prisma.car.delete({ where: { id: carId } });

    await this.addLog({
      actorId,
      actorRole,
      action: 'DELETE_CAR',
      entityType: 'Car',
      entityId: removed.id,
      metadata: { name: removed.name },
    });

    return { deleted: true, carId: removed.id };
  }

  private async findCar(carId: string) {
    const car = await this.prisma.car.findUnique({
      where: { id: carId },
      include: {
        images: { orderBy: { position: 'asc' } },
        specifications: true,
      },
    });
    if (!car) {
      throw new NotFoundException('Car not found.');
    }
    return car;
  }

  private async getImagesForCar(carId: string): Promise<CarImageView[]> {
    const images = await this.prisma.carImage.findMany({
      where: { carId },
      orderBy: { position: 'asc' },
    });
    return images.map((image) => ({
      id: image.id,
      url: image.imageUrl,
      position: image.position,
    }));
  }

  private mapSpec(specs: CarSpecView[]): CarSpecView {
    const first = specs[0];
    return {
      engine: first?.engine ?? '',
      transmission: first?.transmission ?? '',
      fuelType: first?.fuelType ?? '',
    };
  }

  private mapCarRecord(car: {
    id: string;
    name: string;
    category: string;
    modelYear: number;
    basePrice: unknown;
    numberOfUnits: number;
    variant: string | null;
    description: string | null;
    availability: 'AVAILABLE' | 'NOT_AVAILABLE' | 'COMING_SOON';
    isFeatured: boolean;
    createdAt: Date;
    updatedAt: Date;
    images: Array<{ id: string; imageUrl: string; position: number }>;
    specifications: CarSpecView[];
  }): CarView {
    const images = car.images.map((image) => ({
      id: image.id,
      url: image.imageUrl,
      position: image.position,
    }));

    return {
      id: car.id,
      name: car.name,
      category: car.category,
      modelYear: car.modelYear,
      basePrice: Number(car.basePrice),
      numberOfUnits: car.numberOfUnits,
      variant: car.variant ?? '',
      description: car.description ?? '',
      availability: car.availability,
      isFeatured: car.isFeatured,
      specs: this.mapSpec(car.specifications),
      images,
      imageUrls: images.map((image) => image.url),
      primaryImageUrl: images[0]?.url ?? null,
      createdAt: car.createdAt.toISOString(),
      updatedAt: car.updatedAt.toISOString(),
    };
  }

  private async addLog(log: {
    actorId: string;
    actorRole: Role;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: unknown;
  }) {
    await this.prisma.activityLog.create({
      data: {
        actorId: log.actorId,
        actorRole: log.actorRole,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata as object | undefined,
      },
    });
  }

  private parseImportFile(file: Express.Multer.File): ParsedImportRow[] {
    const extension = this.getFileExtension(file.originalname);

    if (extension === 'csv') {
      return this.parseCsv(file.buffer);
    }

    if (extension === 'xlsx' || extension === 'xls') {
      return this.parseExcel(file.buffer);
    }

    throw new BadRequestException(
      'Unsupported file type. Upload a .csv, .xlsx, or .xls file.',
    );
  }

  private parseCsv(buffer: Buffer): ParsedImportRow[] {
    const content = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!lines.length) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0]);
    const rows: ParsedImportRow[] = [];

    for (let i = 1; i < lines.length; i += 1) {
      const values = this.parseCsvLine(lines[i]);
      const row: ParsedImportRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });
      rows.push(row);
    }

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  }

  private parseExcel(buffer: Buffer): ParsedImportRow[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        return [];
      }

      const sheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_json<ParsedImportRow>(sheet, { defval: '' });
    } catch {
      throw new BadRequestException(
        'Could not parse file. Ensure it is a valid .xlsx or .xls file.',
      );
    }
  }

  private getFileExtension(filename: string): string {
    const parts = filename.toLowerCase().split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  private normalizeRowKeys(row: ParsedImportRow): ParsedImportRow {
    const normalized: ParsedImportRow = {};
    Object.entries(row).forEach(([key, value]) => {
      const keyAlias =
        this.headerAliases[this.normalizeHeaderKey(key)] ?? key.trim();
      normalized[keyAlias] = typeof value === 'string' ? value.trim() : value;
    });
    return normalized;
  }

  private isEmptyRow(row: ParsedImportRow): boolean {
    return Object.values(row).every((value) => {
      if (value === null || value === undefined) {
        return true;
      }
      return String(value).trim().length === 0;
    });
  }

  private validateHeaders(firstRow: ParsedImportRow): void {
    const headers = Object.keys(firstRow).filter(
      (header) => header !== 'serialNumber',
    );

    const missingRequired = this.requiredImportColumns.filter(
      (column) => !headers.includes(column),
    );

    if (missingRequired.length > 0) {
      throw new BadRequestException(
        `Missing required columns: ${missingRequired.join(', ')}`,
      );
    }

    const unknownColumns = headers.filter(
      (header) =>
        !this.importColumns.includes(
          header as (typeof this.importColumns)[number],
        ),
    );

    if (unknownColumns.length > 0) {
      throw new BadRequestException(
        `Unknown columns found: ${unknownColumns.join(', ')}`,
      );
    }
  }

  private asNonEmptyString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : null;
  }

  private asOptionalString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : null;
  }

  private asNumber(value: unknown): number | null {
    if (value === null || value === undefined || String(value).trim() === '') {
      return null;
    }
    const parsed = Number(String(value).replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private asPriceNumber(value: unknown): number | null {
    if (value === null || value === undefined || String(value).trim() === '') {
      return null;
    }

    const raw = String(value)
      .trim()
      .replace(/,/g, '')
      .replace(/^NGN\s*/i, '');
    const lower = raw.toLowerCase();

    if (lower.endsWith('m')) {
      const num = Number(lower.slice(0, -1));
      return Number.isFinite(num) ? num * 1_000_000 : null;
    }

    if (lower.endsWith('k')) {
      const num = Number(lower.slice(0, -1));
      return Number.isFinite(num) ? num * 1_000 : null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeAvailability(value: unknown): CarAvailability | null {
    const raw = this.asOptionalString(value);
    if (!raw) return null;

    const normalized = raw.toLowerCase().replace(/\s+/g, ' ').trim();
    if (normalized === 'available') return 'AVAILABLE';
    if (normalized === 'not available') return 'NOT_AVAILABLE';
    if (normalized === 'coming soon') return 'COMING_SOON';

    return null;
  }

  private normalizeHeaderKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
