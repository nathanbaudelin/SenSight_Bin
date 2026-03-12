import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Bin, BinSchema } from './bin.schema';
import { BinController } from './bin.controller';
import { BinService } from './bin.service';
import { CounterModule } from 'src/counter/counter.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bin.name, schema: BinSchema }]),
    CounterModule,
  ],
  controllers: [BinController],
  providers: [BinService],
})
export class BinModule {}
