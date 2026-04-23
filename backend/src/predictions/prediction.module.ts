import { Module } from '@nestjs/common';
import { PredictionController } from './prediction.controlleur';
import { PredictionService } from './prediction.service';
import { MeasurementModule } from 'src/measurements/measurement.module';

@Module({
  imports: [MeasurementModule],
  controllers: [PredictionController],
  providers: [PredictionService],
})
export class PredictionModule {}
