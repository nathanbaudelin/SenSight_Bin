import { Injectable, Logger } from '@nestjs/common';
import { AlertService } from './alerts/alert.service';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { MeasurementDocument } from './measurements/measurement.schema';
import { AlertStatus, AlertType } from './tools/enums';

export interface LastMeasurementPerBin {
  _id: string;
  lastMeasurement: {
    bin_id: string;
    fill_level: number;
    createdAt: Date;
    updatedAt?: Date;
  };
}

@Injectable()
export class MonitoringService {
  constructor(
    private readonly measurementModel: Model<MeasurementDocument>,
    private readonly alertService: AlertService,
    private readonly logger = new Logger(MonitoringService.name),
  ) {}

  @Cron('0 1 * * 1') // Monday 01:00 AM
  async checkInactiveSensors() {
    this.logger.log('Running weekly sensor inactivity check...');

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const lastMeasurements: LastMeasurementPerBin[] =
      await this.measurementModel.aggregate([
        {
          $sort: { createdAt: -1 },
        },
        {
          $group: {
            _id: '$bin_id',
            lastMeasurement: { $first: '$$ROOT' },
          },
        },
      ]);

    for (const item of lastMeasurements) {
      const measurement = item.lastMeasurement;
      const existingAlert = await this.alertService.findAll({
        limit: 1,
        type: AlertType.SENSOR_INACTIVE,
        binId: measurement.bin_id,
        noStatus: AlertStatus.RESOLVED,
      });

      if (measurement.createdAt < fourDaysAgo) {
        if (existingAlert.data.length === 0) {
          await this.alertService.create({
            bin_id: measurement.bin_id,
            type: AlertType.SENSOR_INACTIVE,
            message: `No data received from ${measurement.bin_id} for more than 4 days.`,
          });
        }
      } else {
        if (existingAlert.data.length > 0) {
          await this.alertService.update(existingAlert.data[0].id, {
            status: AlertStatus.RESOLVED,
          });
        }
      }
    }

    this.logger.log('Sensor inactivity check completed.');
  }
}
