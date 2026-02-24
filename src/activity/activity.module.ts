import { Module } from '@nestjs/common';
import { StoreModule } from '../store/store.module';
import { ActivityController } from './activity.controller';

@Module({
  imports: [StoreModule],
  controllers: [ActivityController],
})
export class ActivityModule {}
