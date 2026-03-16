import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Measurement, MeasurementSchema } from './measurement.schema';
import { MeasurementService } from './measurement.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Measurement.name, schema: MeasurementSchema },
    ]),
  ],
  providers: [MeasurementService],
  exports: [MeasurementService],
})
export class MeasurementModule {}
