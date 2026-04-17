import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

@Exclude()
export class PredictionDto {
  @Expose()
  @IsString()
  @ApiProperty({
    description: 'Bin id',
    example: 'BIN-001',
    examples: ['BIN-001', 'BIN-002', 'BIN-003'],
  })
  bin_id: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Prediction unit',
    example: 'percentage_0_to_1',
  })
  prediction_unit?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Forecast days',
    example: 30,
  })
  forecast_days?: number;

  @Expose()
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @ApiProperty({
    description: 'Prediction data',
    example: [0.83, 0.84, 0.86, 0.05, 0.06],
  })
  data: number[];
}
