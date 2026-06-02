import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

type PrismaShutdownHookClient = PrismaClient & {
  $on(event: 'beforeExit', callback: () => Promise<void>): void;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Prisma's beforeExit hook is kept typed locally because generated client types can vary by version.
    (this as PrismaShutdownHookClient).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
