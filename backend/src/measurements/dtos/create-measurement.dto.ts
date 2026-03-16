import { ApiProperty } from '@nestjs/swagger';
import { IsPositive } from 'class-validator';

export class MeasurementCreateDto {
  @IsPositive()
  @ApiProperty({
    description: 'Filling level measurement (raw data)',
    example: 250,
    examples: [250, 105, 48],
  })
  filling_level: number;

  @IsPositive()
  @ApiProperty({
    description: 'Battery level measurement (percentage)',
    example: 100,
    examples: [100, 50, 20],
  })
  battery_level: number;
}
