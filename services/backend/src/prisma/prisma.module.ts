import { Global, Module } from '@nestjs/common';
import { prismaClient } from '@packages/database';

export const PRISMA = 'PRISMA';
@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      useValue: prismaClient,
    },
  ],
  exports: [PRISMA],
})
export class PrismaModule {}
