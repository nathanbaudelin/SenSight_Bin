import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AlertStatus } from 'src/tools/enums';

export class AlertUpdateDto {
  @IsEnum(AlertStatus)
  @ApiPropertyOptional({
    description: 'Alert status',
    enum: AlertStatus,
    example: AlertStatus.OPEN,
    examples: [
      AlertStatus.OPEN,
      AlertStatus.ACKNOWLEDGED,
      AlertStatus.RESOLVED,
    ],
  })
  status?: AlertStatus;
}
