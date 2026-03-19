import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Bin, BinSchema } from './bin.schema';
import { BinController } from './bin.controller';
import { BinService } from './bin.service';
import { CounterModule } from 'src/counter/counter.module';
import { MeasurementModule } from 'src/measurements/measurement.module';
import { AlertModule } from 'src/alerts/alert.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bin.name, schema: BinSchema }]),
    CounterModule,
    MeasurementModule,
    forwardRef(() => AlertModule),
  ],
  controllers: [BinController],
  providers: [BinService],
  exports: [BinService],
})
export class BinModule {}
