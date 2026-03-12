import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bin, BinDocument } from './bin.schema';
import { BinCreateDto } from './dtos/create-bin.dto';
import { BinDto } from './dtos/response-bin.dto';
import { plainToInstance } from 'class-transformer';
import { CounterService } from 'src/counter/counter.service';
import { Location } from 'src/tools/tools';

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

  // async findAll(): Promise<Bin[]> {
  //   return this.binModel.find().exec();
  // }

  // async findOne(bin_id: string): Promise<Bin> {
  //   const bin = await this.binModel.findOne({ bin_id }).exec();

  //   if (!bin) {
  //     throw new NotFoundException(`Bin ${bin_id} not found`);
  //   }

  //   return bin;
  // }

  // async update(bin_id: string, updateData: Partial<Bin>): Promise<Bin> {
  //   const updated = await this.binModel.findOneAndUpdate(
  //     { bin_id },
  //     updateData,
  //     { new: true },
  //   );

  //   if (!updated) {
  //     throw new NotFoundException(`Bin ${bin_id} not found`);
  //   }

  //   return updated;
  // }

  // async delete(bin_id: string): Promise<void> {
  //   const result = await this.binModel.deleteOne({ bin_id });

  //   if (result.deletedCount === 0) {
  //     throw new NotFoundException(`Bin ${bin_id} not found`);
  //   }
  // }
}
