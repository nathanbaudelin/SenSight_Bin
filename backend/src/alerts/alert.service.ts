import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Alert, AlertDocument } from './alert.schema';
import { Model } from 'mongoose';
import { AlertCreateDto } from './dtos/create-alert.dto';
import { AlertDto } from './dtos/response-alert.dto';
import { plainToInstance } from 'class-transformer';
import { CounterService } from 'src/counter/counter.service';
import { AlertQueryDto } from './dtos/query-alert.dto';
import { PaginatedContentDto } from 'src/tools/pagination.dto';
import { AlertStatus } from 'src/tools/enums';
import { AlertUpdateDto } from './dtos/update-alert.dot';
import { ApiException } from 'src/tools/api.exception';

@Injectable()
export class AlertService {
  constructor(
    @InjectModel(Alert.name)
    private alertModel: Model<AlertDocument>,
    private counterService: CounterService,
  ) {}

  async create(alert: AlertCreateDto): Promise<AlertDto> {
    const newAlert: Alert = {
      id: await this.counterService.getNextAlertId(),
      ...alert,
    };
    const created = new this.alertModel(newAlert);
    const saved = await created.save();

    return plainToInstance(AlertDto, saved.toObject());
  }

  async findAll({
    page = 1,
    limit = 10,
    type,
    status,
    binId,
  }: AlertQueryDto = {}): Promise<PaginatedContentDto<AlertDto>> {
    let filter = {};

    if (type) filter = { ...filter, type: type };
    if (binId) filter = { ...filter, bin_id: binId };
    if (status) {
      filter = { ...filter, status: status };
    } else {
      filter = { ...filter, status: { $ne: AlertStatus.RESOLVED } };
    }

    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      this.alertModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.alertModel.countDocuments(filter),
    ]);

    const res = alerts.map((alert) =>
      plainToInstance(AlertDto, alert.toObject()),
    );

    return {
      data: res,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOneId(alertId: string): Promise<AlertDto> {
    const existingAlert = await this.alertModel.findOne({ id: alertId });

    if (!existingAlert)
      throw new ApiException('alert.not_found', 404, { provided: alertId });

    return plainToInstance(AlertDto, existingAlert.toObject());
  }

  async update(alertId: string, updateData: AlertUpdateDto): Promise<AlertDto> {
    const updated = await this.alertModel.findOneAndUpdate(
      { id: alertId },
      updateData,
      { returnDocument: 'after' },
    );

    if (!updated) throw new ApiException('alert.not_found', 404, { alertId });

    return plainToInstance(AlertDto, updated.toObject());
  }
}
