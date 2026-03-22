import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter, CounterDocument } from './counter.schema';

@Injectable()
export class CounterService {
  constructor(
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
  ) {}

  // Atomic increment
  async getNextValue(name: string): Promise<number> {
    const counter = await this.counterModel.findOneAndUpdate(
      { name },
      { $inc: { value: 1 } },
      { returnDocument: 'after', upsert: true },
    );

    return counter.value;
  }

  // Convenience for BIN-001 style
  async getNextBinId(): Promise<string> {
    const number = await this.getNextValue('bin');
    return `BIN-${number.toString().padStart(3, '0')}`;
  }

  async getNextAlertId(): Promise<string> {
    const number = await this.getNextValue('alert');
    return `ALERT-${number.toString().padStart(3, '0')}`;
  }

  async getNextRouteId(): Promise<string> {
    const number = await this.getNextValue('route');
    return `ROUTE-${number.toString().padStart(3, '0')}`;
  }
}
