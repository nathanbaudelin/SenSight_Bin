import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsNumber } from 'class-validator';

@Exclude()
@Schema()
export class Location {
  @Expose()
  @Prop({ required: true, default: 0 })
  @IsNumber()
  @ApiProperty({
    description: 'Latitude',
    example: 43.610769,
    examples: [43.610769, 43.611245, 43.609812],
  })
  lat: number;

  @Expose()
  @Prop({ required: true, default: 0 })
  @IsNumber()
  @ApiProperty({
    description: 'Longitude',
    example: 3.876716,
    examples: [3.876716, 3.875902, 3.878301],
  })
  lng: number;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
