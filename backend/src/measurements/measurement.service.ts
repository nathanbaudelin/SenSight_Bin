import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Measurement, MeasurementDocument } from './measurement.schema';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { MeasurementDto } from './dtos/response-measurement.dto';
import { MeasurementQueryDto } from './dtos/query-measurement.dto';
import { PaginatedContentDto } from 'src/tools/pagination.dto';

interface AggregationResult {
  measurements: MeasurementDocument[];
  total: { count: number }[];
}

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

  async findAll(
    { page = 1, limit = 100, binType, days }: MeasurementQueryDto = {},
    binId?: string,
  ): Promise<PaginatedContentDto<MeasurementDto>> {
    const skip = (page - 1) * limit;
    let match = {};

    if (binId) {
      match = { ...match, bin_id: binId };
    }

    if (days !== undefined) {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      match = { ...match, timestamp: { $gte: fromDate } };
    }

    const aggregationPipeline: any[] = [];

    if (binType) {
      aggregationPipeline.push({
        $lookup: {
          from: 'bins',
          localField: 'bin_id',
          foreignField: 'id',
          as: 'bin',
        },
      });
      aggregationPipeline.push({ $unwind: '$bin' });
      match['bin.type'] = binType;
    }
    aggregationPipeline.push({ $match: match });
    aggregationPipeline.push({ $project: { bin: 0 } });
    aggregationPipeline.push({
      $facet: {
        measurements: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [{ $count: 'count' }],
      },
    });

    const result: AggregationResult[] =
      await this.measurementModel.aggregate(aggregationPipeline);
    const measurementsRaw: MeasurementDocument[] =
      result[0]?.measurements || [];
    const total: number = result[0]?.total[0]?.count || 0;

    // Convert plain objects to MeasurementDto instances
    const measurements: MeasurementDto[] = measurementsRaw.map((measurement) =>
      plainToInstance(MeasurementDto, measurement),
    );

    return {
      data: measurements,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }
}
