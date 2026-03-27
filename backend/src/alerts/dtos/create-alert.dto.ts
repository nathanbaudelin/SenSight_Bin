import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { AlertType } from 'src/tools/enums';

export class AlertCreateDto {
  @IsString()
  @ApiProperty({
    description: 'Bin id',
    example: 'BIN-001',
    examples: ['BIN-001', 'BIN-002', 'BIN-003'],
  })
  bin_id: string;

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
}
