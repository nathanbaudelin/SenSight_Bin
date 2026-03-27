import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsDate, IsEnum, IsString } from 'class-validator';
import { AlertStatus, AlertType } from 'src/tools/enums';

@Exclude()
export class AlertDto {
  @Expose()
  @IsString()
  @ApiProperty({
    description: 'Alert id',
    example: 'ALERT-001',
    examples: ['ALERT-001', 'ALERT-002', 'ALERT-003'],
  })
  id: string;

  @Expose()
  @IsString()
  @ApiProperty({
    description: 'Bin id',
    example: 'BIN-001',
    examples: ['BIN-001', 'BIN-002', 'BIN-003'],
  })
  bin_id: string;

  @Expose()
  @IsEnum(AlertType)
  @ApiProperty({
    description: 'Alert type',
    enum: AlertType,
    example: AlertType.OVERFLOW,
    examples: [
      AlertType.OVERFLOW,
      AlertType.SENSOR_INACTIVE,
      AlertType.SENSOR_FAILURE,
    ],
  })
  type: AlertType;

  @Expose()
  @IsString()
  @ApiProperty({
    description: 'Alert message',
    example:
      'Bin BIN-001 has exceeded 95% fill level and requires immediate collection.',
    examples: [
      'Bin BIN-001 has exceeded 95% fill level and requires immediate collection.',
      'No measurement received from BIN-002 for the past 24 hours. Sensor might be offline.',
      'BIN-003 reported an error code 504. Sensor malfunction suspected.',
    ],
  })
  message: string;

  @Expose()
  @IsEnum(AlertStatus)
  @ApiProperty({
    description: 'Alert status',
    enum: AlertStatus,
    example: AlertStatus.OPEN,
    examples: [
      AlertStatus.OPEN,
      AlertStatus.ACKNOWLEDGED,
      AlertStatus.RESOLVED,
    ],
  })
  status: AlertStatus;

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
