import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Prisma v5 typing'de beforeExit event'i strict tipte gorunmeyebilir.
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
