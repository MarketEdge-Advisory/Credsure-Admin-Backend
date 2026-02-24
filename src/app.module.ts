import { Module } from '@nestjs/common';
import { ActivityModule } from './activity/activity.module';
import { AdminConfigModule } from './admin-config/admin-config.module';
import { AuthModule } from './auth/auth.module';
import { CarsModule } from './cars/cars.module';
import { PublicModule } from './public/public.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AdminConfigModule,
    CarsModule,
    PublicModule,
    ActivityModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
