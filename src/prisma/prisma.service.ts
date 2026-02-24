import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    // Parse the connection string manually
    const connectionString = process.env.DATABASE_URL;

    const pool = new Pool({
      connectionString: connectionString,
    });

    const adapter = new PrismaPg(pool);
    super({
      adapter,
    });

    this.pool = pool;
  }

  private static isConnected = false;

  async onModuleInit() {
    if (!PrismaService.isConnected) {
      await this.$connect();
      PrismaService.isConnected = true;
      console.log('Connected to the database.');
    }
  }

  async onModuleDestroy() {
    if (PrismaService.isConnected) {
      await this.$disconnect();
      await this.pool.end();
      PrismaService.isConnected = false;
      console.log('Disconnected from the database.');
    }
  }
}
