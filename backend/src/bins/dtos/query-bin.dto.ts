import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BinStatus, BinType } from 'src/tools/enums';
import { PaginationDto } from 'src/tools/pagination.dto';

export class BinQueryDto extends IntersectionType(PaginationDto) {
  @IsOptional()
  @IsEnum(BinType)
  type?: BinType;

  @IsOptional()
  @IsEnum(BinStatus)
  status?: BinStatus;
}

export class BinQuerySwaggerDto {
  @ApiPropertyOptional({
    description: 'Optional search string to filter bin by type',
    type: 'string',
    enum: Object.values(BinType),
  })
  type?: BinType;

  @ApiPropertyOptional({
    description: 'Optional search string to filter bin by status',
    type: 'string',
    enum: Object.values(BinStatus),
  })
  status?: BinStatus;

  @ApiPropertyOptional({
    description: 'Number of the page',
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Limit of elements by page',
  })
  limit?: number;
}
