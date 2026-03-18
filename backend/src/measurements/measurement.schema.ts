import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type MeasurementDocument = Measurement & Document;

@Schema({ collection: 'measurements', timestamps: true })
export class Measurement {
  @Prop({ required: true, index: true })
  bin_id: string;

  @Prop({ required: true, default: 0, mi: 0, max: 100 })
  filling_level?: number;

  @Prop({ required: true, min: 0, max: 100, default: 0 })
  battery_level?: number;

  @Prop({ required: true, default: () => new Date(), type: Date })
  timestamp?: Date;
}

export const MeasurementSchema = SchemaFactory.createForClass(Measurement);

// Indexes
MeasurementSchema.index({ bin_id: 1, timestamp: -1 });
MeasurementSchema.index({ bin_id: 1, createdAt: -1 });
