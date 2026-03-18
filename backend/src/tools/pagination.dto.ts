import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page? = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit? = 10;
}

export class PaginatedContentDto<T> {
  @IsArray()
  data: T[];

  @IsNumber()
  @Min(0)
  total: number;

  @IsInt()
  @Min(1)
  page: number;

  @IsInt()
  @Min(1)
  lastPage: number;
}

export class PaginatedContentSwaggerDto {
  @ApiProperty({
    description: 'Total of elements return',
    example: 2,
    examples: [10, 20, 30],
  })
  total: number;

  @ApiProperty({
    description: 'Actual page',
    example: 1,
    examples: [1, 2, 3],
  })
  page: number;

  @ApiProperty({
    description: 'Last page',
    example: 1,
    examples: [1, 2, 3],
  })
  lastPage: number;
}
