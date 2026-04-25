import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { BidsModule } from './modules/bids/bids.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { HealthModule } from './modules/health/health.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PrismaModule } from './prisma/prisma.module';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';

@Module({
  imports: [
    // .env degiskenlerini global acik hale getirir
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60 * 1000,
        limit: 10,
      },
    ]),
    PrismaModule,
    AuthModule,
    JobsModule,
    BidsModule,
    ProjectsModule,
    MilestonesModule,
    DeliveriesModule,
    DisputesModule,
    HealthModule,
    PaymentsModule,
    ReportsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
