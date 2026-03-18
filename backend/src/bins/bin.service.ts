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
import { PaginatedContentDto } from 'src/tools/pagination.dto';
import { BinQueryDto } from './dtos/query-bin.dto';

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

  async findAll({
    page = 1,
    limit = 10,
    type,
    status,
  }: BinQueryDto = {}): Promise<PaginatedContentDto<BinDto>> {
    let filter = {};

    if (type) filter = { ...filter, type: type };
    if (status) filter = { ...filter, status: status };

    const skip = (page - 1) * limit;

    const [bins, total] = await Promise.all([
      this.binModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.binModel.countDocuments(filter),
    ]);

    const res = bins.map((bin) => plainToInstance(BinDto, bin.toObject()));

    return {
      data: res,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOneId(binId: string): Promise<BinDto> {
    const existingBin = await this.binModel.findOne({ id: binId });

    if (!existingBin)
      throw new ApiException('bin.not_found', 404, { provided: binId });

    return plainToInstance(BinDto, existingBin.toObject());
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
}
