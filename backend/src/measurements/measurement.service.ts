import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Measurement, MeasurementDocument } from './measurement.schema';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { MeasurementDto } from './dtos/response-measurement.dto';

@Injectable()
export class MeasurementService {
  constructor(
    @InjectModel(Measurement.name)
    private measurementModel: Model<MeasurementDocument>,
  ) {}

  async create(measurement: Measurement): Promise<MeasurementDto> {
    const created = new this.measurementModel(measurement);
    const saved = await created.save();

    return plainToInstance(MeasurementDto, saved.toObject());
  }
}
