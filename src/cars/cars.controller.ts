import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../common/enums/role.enum';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { successResponse } from '../common/utils/response.util';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CarsService } from './cars.service';
import {
  CreateCarDto,
  ReorderImagesDto,
  ToggleAvailabilityDto,
  ToggleFeaturedDto,
  UpdateCarDto,
  UpdateCarPriceDto,
  UpsertCarImagesDto,
} from './dto/cars.dto';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SuzukiAdmin, Role.SuperAdmin)
@ApiTags('Cars')
@ApiBearerAuth()
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Get()
  async getCars() {
    const cars = await this.carsService.getCars();
    return successResponse('Cars fetched successfully', cars);
  }

  @Get(':carId')
  async getCar(@Param('carId') carId: string) {
    const car = await this.carsService.getCarById(carId);
    return successResponse('Car fetched successfully', car);
  }

  @Post()
  async createCar(
    @Req() req: RequestWithUser,
    @Body() createCarDto: CreateCarDto,
  ) {
    const car = await this.carsService.createCar(
      req.user!.userId,
      req.user!.role,
      createCarDto,
    );
    return successResponse('Car created successfully', car);
  }

  @Patch(':carId')
  async updateCar(
    @Req() req: RequestWithUser,
    @Param('carId') carId: string,
    @Body() updateCarDto: UpdateCarDto,
  ) {
    const car = await this.carsService.updateCar(
      req.user!.userId,
      req.user!.role,
      carId,
      updateCarDto,
    );
    return successResponse('Car updated successfully', car);
  }

  @Patch(':carId/price')
  async updatePrice(
    @Req() req: RequestWithUser,
    @Param('carId') carId: string,
    @Body() updateCarPriceDto: UpdateCarPriceDto,
  ) {
    const car = await this.carsService.updatePrice(
      req.user!.userId,
      req.user!.role,
      carId,
      updateCarPriceDto,
    );
    return successResponse('Car price updated successfully', car);
  }

  @Patch(':carId/images')
  async upsertImages(
    @Req() req: RequestWithUser,
    @Param('carId') carId: string,
    @Body() upsertCarImagesDto: UpsertCarImagesDto,
  ) {
    const images = await this.carsService.upsertImages(
      req.user!.userId,
      req.user!.role,
      carId,
      upsertCarImagesDto,
    );
    return successResponse('Car images updated successfully', images);
  }

  @Delete(':carId/images/:imageId')
  async deleteImage(
    @Req() req: RequestWithUser,
    @Param('carId') carId: string,
    @Param('imageId') imageId: string,
  ) {
    const images = await this.carsService.deleteImage(
      req.user!.userId,
      req.user!.role,
      carId,
      imageId,
    );
    return successResponse('Car image deleted successfully', images);
  }

  @Patch(':carId/images/reorder')
  async reorderImages(
    @Req() req: RequestWithUser,
    @Param('carId') carId: string,
    @Body() reorderImagesDto: ReorderImagesDto,
  ) {
    const images = await this.carsService.reorderImages(
      req.user!.userId,
      req.user!.role,
      carId,
      reorderImagesDto,
    );
    return successResponse('Car images reordered successfully', images);
  }

  @Patch(':carId/availability')
  async toggleAvailability(
    @Req() req: RequestWithUser,
    @Param('carId') carId: string,
    @Body() toggleAvailabilityDto: ToggleAvailabilityDto,
  ) {
    const car = await this.carsService.toggleAvailability(
      req.user!.userId,
      req.user!.role,
      carId,
      toggleAvailabilityDto,
    );
    return successResponse('Car availability updated successfully', car);
  }

  @Patch(':carId/featured')
  async toggleFeatured(
    @Req() req: RequestWithUser,
    @Param('carId') carId: string,
    @Body() toggleFeaturedDto: ToggleFeaturedDto,
  ) {
    const car = await this.carsService.toggleFeatured(
      req.user!.userId,
      req.user!.role,
      carId,
      toggleFeaturedDto,
    );
    return successResponse('Car featured status updated successfully', car);
  }

  @Delete(':carId')
  async deleteCar(@Req() req: RequestWithUser, @Param('carId') carId: string) {
    const result = await this.carsService.deleteCar(
      req.user!.userId,
      req.user!.role,
      carId,
    );
    return successResponse('Car deleted successfully', result);
  }
}
