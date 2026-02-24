import { Module } from '@nestjs/common';
import { CarsModule } from '../cars/cars.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicController } from './public.controller';

@Module({
  imports: [PrismaModule, CarsModule],
  controllers: [PublicController],
})
export class PublicModule {}
