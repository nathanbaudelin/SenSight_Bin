import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsPositive } from 'class-validator';

export class MeasurementCreateDto {
  @IsPositive()
  @Type(() => Number)
  @ApiProperty({
    description: 'Filling level measurement (raw data)',
    example: 250,
    examples: [250, 105, 48],
  })
  filling_level: number;

  @IsPositive()
  @Type(() => Number)
  @ApiProperty({
    description: 'Battery level measurement (percentage)',
    example: 100,
    examples: [100, 50, 20],
  })
  battery_level: number;
}
