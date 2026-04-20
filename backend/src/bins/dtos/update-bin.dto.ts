import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { BinStatus, BinType } from 'src/tools/enums';
import { Location } from 'src/tools/tools';

export class BinUpdateDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Device uid',
  })
  device_uid?: string;

  @IsOptional()
  @IsEnum(BinType)
  @ApiPropertyOptional({
    description: 'Bin type',
    enum: BinType,
    example: BinType.PLASTIC,
    examples: [BinType.PLASTIC, BinType.GLASS, BinType.GENERAL],
  })
  type?: BinType;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Bin Location',
    type: () => Location,
  })
  location?: Location;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  @ApiProperty({
    description: 'Bin depth',
    example: 120,
    examples: [120, 100, 150],
  })
  depth?: number;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  @ApiProperty({
    description: "Bin's filling level",
    example: 35,
    examples: [35, 78, 92],
  })
  filling_level?: number;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  @ApiProperty({
    description: "Bin's battery level",
    example: 82,
    examples: [82, 64, 81],
  })
  battery_level?: number;

  @IsOptional()
  @IsEnum(BinStatus)
  @ApiPropertyOptional({
    description: 'Bin Status',
    enum: BinStatus,
    example: BinStatus.ACTIVE,
    examples: [BinStatus.ACTIVE, BinStatus.UNVERIFIED, BinStatus.MAINTENANCE],
  })
  status?: BinStatus;
}
