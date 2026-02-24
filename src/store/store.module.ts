import { Module } from '@nestjs/common';
import { DataStoreService } from './data-store.service';

@Module({
  providers: [DataStoreService],
  exports: [DataStoreService],
})
export class StoreModule {}
