import { Module } from '@nestjs/common';
import { RpmController } from './rpm.controller';
import { RpmService } from './rpm.service';

@Module({
  controllers: [RpmController],
  providers: [RpmService],
})
export class RpmModule {}
