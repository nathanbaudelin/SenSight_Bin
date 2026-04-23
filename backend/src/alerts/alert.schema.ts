import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AlertStatus, AlertType } from 'src/tools/enums';

export type AlertDocument = Alert & Document;

@Schema({ collection: 'alert', timestamps: true })
export class Alert {
  @Prop({ required: true, unique: true, index: true, immutable: true })
  id: string;

  @Prop({ required: true, index: true, immutable: true })
  bin_id: string;

  @Prop({ required: true, enum: AlertType })
  type: AlertType;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, enum: AlertStatus, default: AlertStatus.OPEN })
  status?: AlertStatus;

  @Prop({ required: true, default: () => new Date(), type: Date })
  timestamp?: Date;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
