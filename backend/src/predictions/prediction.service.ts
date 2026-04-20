import { Injectable } from '@nestjs/common';
import { PredictionDto } from './dtos/response-prediction.dto';
import { MeasurementService } from 'src/measurements/measurement.service';
import { MeasurementDto } from 'src/measurements/dtos/response-measurement.dto';

@Injectable()
export class PredictionService {
  constructor(private readonly measurementService: MeasurementService) {}

  async getPredictionsForBin(binId: string): Promise<PredictionDto> {
    const measurements = await this.measurementService.findAll(
      { days: 30 },
      binId,
    );

    const request = {
      bin_id: binId,
      history: this.buildHistory(measurements.data),
    };

    const aiUrl = process.env.AI_URL;
    const res: Response = await fetch(`${aiUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const response: PredictionDto = (await res.json()) as PredictionDto;

    return response;
  }

  buildHistory(measurements: MeasurementDto[]): [number, number, number][] {
    if (!measurements.length) return [];

    const sorted = [...measurements].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const startDate = new Date(sorted[0].timestamp);

    return sorted.map((m) => {
      const currentDate = new Date(m.timestamp);
      const dayOffset = Math.floor(
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const fill = m.filling_level / 100;
      const battery = m.battery_level / 100;

      return [dayOffset, fill, battery];
    });
  }
}
