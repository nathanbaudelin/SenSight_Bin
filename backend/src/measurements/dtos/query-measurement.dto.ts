import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BinType } from 'src/tools/enums';
import { PaginationDto } from 'src/tools/pagination.dto';

export class MeasurementQueryDto extends IntersectionType(PaginationDto) {
  @IsOptional()
  @IsEnum(BinType)
  binType?: string;
}

export class MeasurementQuerySwaggerDto {
  @ApiPropertyOptional({
    description: "Optional search string to filter measurements bu bin's type",
    type: 'string',
    enum: Object.values(BinType),
  })
  binType?: BinType;

  @ApiPropertyOptional({
    description: 'Number of the page',
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Limit of elements by page',
  })
  limit?: number;
}
