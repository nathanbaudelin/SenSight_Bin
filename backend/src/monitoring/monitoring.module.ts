import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Measurement,
  MeasurementSchema,
} from 'src/measurements/measurement.schema';
import { MonitoringService } from './monitoring.service';
import { AlertModule } from 'src/alerts/alert.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Measurement.name, schema: MeasurementSchema },
    ]),
    AlertModule,
  ],
  providers: [MonitoringService],
})
export class MonitoringModule {}
