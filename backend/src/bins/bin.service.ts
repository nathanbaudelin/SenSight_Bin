import { Injectable, Logger } from '@nestjs/common';
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
import { AlertStatus, AlertType, BinStatus } from 'src/tools/enums';
import { AlertService } from 'src/alerts/alert.service';

// interface RegisterDeviceInput {
//   device_uid: string;
//   depth?: number;
//   battery_level?: number;
// }

@Injectable()
export class BinService {
  private readonly logger = new Logger(BinService.name);

  constructor(
    @InjectModel(Bin.name)
    private binModel: Model<BinDocument>,
    private counterService: CounterService,
    private readonly alertService: AlertService,
  ) {}

  async create(bin: BinCreateDto): Promise<BinDto> {
    if (bin.device_uid) {
      const existingBin = await this.binModel.findOne({
        device_uid: bin.device_uid,
      });

      if (existingBin) {
        this.logger.log(
          `Existing device registration reused for uid=${bin.device_uid}, bin=${existingBin.id}`,
        );
        return plainToInstance(BinDto, existingBin.toObject());
      }
    }
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

  // async registerDevice({
  //   device_uid,
  //   depth,
  //   battery_level,
  // }: RegisterDeviceInput): Promise<BinDto> {
  //   const existingBin = await this.binModel.findOne({ device_uid }).exec();
  //   if (existingBin) {
  //     this.logger.log(
  //       `Existing device registration reused for uid=${device_uid}, bin=${existingBin.id}`,
  //     );
  //     return plainToInstance(BinDto, existingBin.toObject());
  //   }

  //   const created = new this.binModel({
  //     id: await this.counterService.getNextBinId(),
  //     device_uid,
  //     type: BinType.UNKNOWN,
  //     depth: depth && depth > 0 ? depth : 100,
  //     battery_level:
  //       battery_level && battery_level > 0 && battery_level <= 100
  //         ? battery_level
  //         : 100,
  //     filling_level: 0,
  //     status: BinStatus.UNVERIFIED,
  //   });

  //   const saved = await created.save();
  //   const res = plainToInstance(BinDto, saved.toObject());
  //   if (res.location) res.location = plainToInstance(Location, res.location);

  //   this.logger.log(
  //     `Created unverified bin=${res.id} for uid=${device_uid} with depth=${res.depth}`,
  //   );

  //   return res;
  // }

  async findAll({
    page = 1,
    limit = 10,
    type,
    status,
  }: BinQueryDto = {}): Promise<PaginatedContentDto<BinDto>> {
    let filter = {};

    if (type) filter = { ...filter, type: type };
    if (status) {
      filter = { ...filter, status: status };
    } else {
      filter = { ...filter, status: { $ne: BinStatus.REMOVED } };
    }

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
    this.logger.log(
      `Measurement received for bin=${binId}: raw_distance=${measurement.filling_level}, battery=${measurement.battery_level}`,
    );

    const bin = await this.binModel.findOne({ id: binId }).exec();

    if (!bin) throw new ApiException('bin.not_found', 404, { binId });

    const res: Measurement = {
      bin_id: binId,
      filling_level: Math.round(
        100 - (measurement.filling_level * 100) / bin.depth,
      ),
      battery_level: measurement.battery_level,
    };

    await this.alertCheck(res);

    await this.update(binId, {
      filling_level: res.filling_level,
      battery_level: res.battery_level,
    });

    this.logger.log(
      `Measurement processed for bin=${binId}: computed_fill=${res.filling_level}, depth=${bin.depth}`,
    );

    return res;
  }

  async alertCheck(res: Measurement) {
    if (res.battery_level < 15) {
      const existingAlert = await this.alertService.findAll({
        limit: 1,
        type: AlertType.LOW_BATTERY,
        binId: res.bin_id,
        noStatus: AlertStatus.RESOLVED,
      });
      if (existingAlert.data.length === 0) {
        await this.alertService.create({
          bin_id: res.bin_id,
          type: AlertType.LOW_BATTERY,
          message:
            'Battery level of ' +
            res.bin_id +
            ' dropped below 15%. Maintenance required soon.',
        });
      }
    }

    if (res.filling_level < 0 || res.filling_level > 100) {
      const existingAlert = await this.alertService.findAll({
        limit: 1,
        type: AlertType.SENSOR_FAILURE,
        binId: res.bin_id,
        noStatus: AlertStatus.RESOLVED,
      });
      if (existingAlert.data.length === 0) {
        await this.alertService.create({
          bin_id: res.bin_id,
          type: AlertType.SENSOR_FAILURE,
          message:
            'Sensor error detected on ' +
            res.bin_id +
            ' (invalid readings or hardware fault).',
        });
      }
    }

    if (res.filling_level > 80 && res.filling_level < 100) {
      const existingAlert = await this.alertService.findAll({
        limit: 1,
        type: AlertType.OVERFLOW,
        binId: res.bin_id,
        noStatus: AlertStatus.RESOLVED,
      });
      if (existingAlert.data.length === 0) {
        await this.alertService.create({
          bin_id: res.bin_id,
          type: AlertType.OVERFLOW,
          message:
            'Bin ' +
            res.bin_id +
            ' is ' +
            res.filling_level.toString() +
            '% full and requires immediate collection.',
        });
      }
    }
  }
}
