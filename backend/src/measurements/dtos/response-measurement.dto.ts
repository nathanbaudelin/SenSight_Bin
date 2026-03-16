import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsDate, IsPositive, IsString } from 'class-validator';

@Exclude()
export class MeasurementDto {
  @Expose()
  @IsString()
  @ApiProperty({
    description: 'Bin id',
    example: 'BIN-001',
    examples: ['BIN-001', 'BIN-002', 'BIN-003'],
  })
  bin_id: string;

  @Expose()
  @IsPositive()
  @ApiProperty({
    description: 'Filling level measurement (percentage)',
    example: 100,
    examples: [100, 50, 20],
  })
  filling_level: number;

  @Expose()
  @IsPositive()
  @ApiProperty({
    description: 'Battery level measurement (percentage)',
    example: 100,
    examples: [100, 50, 20],
  })
  battery_level: number;

  @Expose()
  @IsDate()
  @ApiProperty({
    description: 'Timestamp',
    example: '2026-03-12T14:30:00Z',
    examples: [
      '2026-03-12T14:30:00Z',
      '2026-01-12T15:00:00Z',
      '2025-10-12T09:15:00Z',
    ],
  })
  timestamp: Date;
}
