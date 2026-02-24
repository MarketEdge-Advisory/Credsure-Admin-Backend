import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class CarsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const { name, category, modelYear, basePrice, variant, description, specs, images } =
      createCarDto;

    const created = await this.prisma.car.create({
      data: {
        name: name.trim(),
        category: category.trim(),
        modelYear,
        basePrice: basePrice.toFixed(2),
        variant: variant?.trim() || null,
        description: description?.trim() || null,
        specifications: {
          create: {
            engine: specs.engine.trim(),
            transmission: specs.transmission.trim(),
            fuelType: specs.fuelType.trim(),
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
    const { name, category, modelYear, basePrice, variant, description, specs } =
      updateCarDto;

    await this.findCar(carId);

    await this.prisma.$transaction(async (tx) => {
      await tx.car.update({
        where: { id: carId },
        data: {
          name: name?.trim(),
          category: category?.trim(),
          modelYear,
          basePrice:
            basePrice !== undefined
              ? basePrice.toFixed(2)
              : undefined,
          variant:
            variant !== undefined
              ? variant.trim() || null
              : undefined,
          description:
            description !== undefined
              ? description.trim() || null
              : undefined,
        },
      });

      if (specs) {
        await tx.carSpecification.deleteMany({ where: { carId } });
        await tx.carSpecification.create({
          data: {
            carId,
            engine: specs.engine.trim(),
            transmission: specs.transmission.trim(),
            fuelType: specs.fuelType.trim(),
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
    variant: string | null;
    description: string | null;
    availability: 'AVAILABLE' | 'OUT_OF_STOCK';
    isFeatured: boolean;
    createdAt: Date;
    updatedAt: Date;
    images: Array<{ id: string; imageUrl: string; position: number }>;
    specifications: CarSpecView[];
  }): CarView {
    return {
      id: car.id,
      name: car.name,
      category: car.category,
      modelYear: car.modelYear,
      basePrice: Number(car.basePrice),
      variant: car.variant ?? '',
      description: car.description ?? '',
      availability: car.availability,
      isFeatured: car.isFeatured,
      specs: this.mapSpec(car.specifications),
      images: car.images.map((image) => ({
        id: image.id,
        url: image.imageUrl,
        position: image.position,
      })),
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
}
