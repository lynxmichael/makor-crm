import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TwoFactorPolicy } from '../auth/two-factor.policy';
import { UserAdminPolicy } from './user-admin.policy';

@Module({
  imports: [PrismaModule],

  controllers: [UsersController],

  providers: [UsersService, TwoFactorPolicy, UserAdminPolicy],

  exports: [UsersService],
})
export class UsersModule {}