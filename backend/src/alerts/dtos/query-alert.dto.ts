import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AlertStatus, AlertType } from 'src/tools/enums';
import { PaginationDto } from 'src/tools/pagination.dto';

export class AlertQueryDto extends IntersectionType(PaginationDto) {
  @IsOptional()
  @IsEnum(AlertType)
  type?: AlertType;

  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @IsOptional()
  @IsEnum(AlertStatus)
  noStatus?: AlertStatus;

  @IsOptional()
  @IsString()
  binId?: string;
}

export class AlertQuerySwaggerDto {
  @ApiPropertyOptional({
    description: 'Optional search string to filter alert by type',
    type: 'string',
    enum: Object.values(AlertType),
  })
  type?: AlertType;

  @ApiPropertyOptional({
    description: 'Optional search string to filter alert by status',
    type: 'string',
    enum: Object.values(AlertStatus),
  })
  status?: AlertStatus;

  @ApiPropertyOptional({
    description:
      "Optional search string to filter alert by status we don't want",
    type: 'string',
    enum: Object.values(AlertStatus),
  })
  noStatus?: AlertStatus;

  @ApiPropertyOptional({
    description: "Optional search string to filter alerts by bin's id",
  })
  binId?: string;

  @ApiPropertyOptional({
    description: 'Number of the page',
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Limit of elements by page',
  })
  limit?: number;
}
