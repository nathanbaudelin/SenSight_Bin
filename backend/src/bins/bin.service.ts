import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bin, BinDocument } from './bin.schema';
import { BinCreateDto } from './dtos/create-bin.dto';
import { BinDto } from './dtos/response-bin.dto';
import { plainToInstance } from 'class-transformer';
import { CounterService } from 'src/counter/counter.service';
import { Location } from 'src/tools/tools';
import { MeasurementCreateDto } from 'src/measurements/dtos/create-measurement.dto';
import { Measurement } from 'src/measurements/measurement.schema';
import { ApiException } from 'src/tools/api.exception';
import { BinUpdateDto } from './dtos/update-bin.dto';

@Injectable()
export class BinService {
  constructor(
    @InjectModel(Bin.name)
    private binModel: Model<BinDocument>,
    private counterService: CounterService,
  ) {}

  async create(bin: BinCreateDto): Promise<BinDto> {
    const newBin: Bin = {
      id: await this.counterService.getNextBinId(),
      ...bin,
    };
    const created = new this.binModel(newBin);
    const saved = await created.save();

    const res = plainToInstance(BinDto, saved.toObject());
    if (res.location) res.location = plainToInstance(Location, res.location);

    return res;
  }

  async registerMeasurement(
    binId: string,
    measurement: MeasurementCreateDto,
  ): Promise<Measurement> {
    const bin = await this.binModel.findOne({ id: binId }).exec();

    if (!bin) throw new ApiException('bin.not_found', 404, { binId });

    const res: Measurement = {
      bin_id: binId,
      filling_level: 100 - (measurement.filling_level * 100) / bin.depth,
      battery_level: measurement.battery_level,
    };

    await this.update(binId, {
      filling_level: res.filling_level,
      battery_level: res.battery_level,
    });

    return res;
  }

  async update(binId: string, updateData: BinUpdateDto): Promise<BinDto> {
    const updated = await this.binModel.findOneAndUpdate(
      { id: binId },
      updateData,
      { returnDocument: 'after' },
    );

    if (!updated) throw new ApiException('bin.not_found', 404, { binId });

    const res = plainToInstance(BinDto, updated.toObject());
    if (res.location) res.location = plainToInstance(Location, res.location);

    return res;
  }
}
