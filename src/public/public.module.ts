import { Module } from '@nestjs/common';
import { CarsModule } from '../cars/cars.module';
import { StoreModule } from '../store/store.module';
import { PublicController } from './public.controller';

@Module({
  imports: [StoreModule, CarsModule],
  controllers: [PublicController],
})
export class PublicModule {}
