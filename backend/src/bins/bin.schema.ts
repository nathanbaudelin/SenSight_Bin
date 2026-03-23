import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BinStatus, BinType } from 'src/tools/enums';
import { Location, LocationSchema } from 'src/tools/tools';

export type BinDocument = Bin & Document;

@Schema({ collection: 'bins', timestamps: true })
export class Bin {
  @Prop({ required: true, unique: true, index: true, immutable: true })
  id: string;

  @Prop({ unique: true, sparse: true, immutable: true })
  device_uid?: string;

  @Prop({ enum: BinType, default: BinType.UNKNOWN })
  type?: BinType;

  @Prop({ type: LocationSchema })
  location?: Location;

  @Prop({ required: true })
  depth: number;

  @Prop({ required: true, min: 0, max: 100, default: 0 })
  filling_level?: number;

  @Prop({ required: true, min: 0, max: 100, default: 0 })
  battery_level?: number;

  @Prop({ enum: BinStatus, default: BinStatus.UNVERIFIED })
  status?: BinStatus;
}

export const BinSchema = SchemaFactory.createForClass(Bin);
