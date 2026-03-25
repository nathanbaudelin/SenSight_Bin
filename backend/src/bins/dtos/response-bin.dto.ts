import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
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

@Exclude()
export class BinDto {
  @Expose()
  @IsString()
  @ApiProperty({
    description: 'Bin id',
    example: 'BIN-001',
    examples: ['BIN-001', 'BIN-002', 'BIN-003'],
  })
  id: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Device uid',
  })
  device_uid?: string;

  @Expose()
  @IsOptional()
  @IsEnum(BinType)
  @ApiPropertyOptional({
    description: 'Bin type',
    enum: BinType,
    example: BinType.PLASTIC,
    examples: [BinType.PLASTIC, BinType.GLASS, BinType.GENERAL],
  })
  type?: BinType;

  @Expose()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Bin Location',
    type: () => Location,
  })
  location?: Location;

  @Expose()
  @IsPositive()
  @ApiProperty({
    description: 'Bin depth',
    example: 120,
    examples: [120, 100, 150],
  })
  depth: number;

  @Expose()
  @IsPositive()
  @Min(0)
  @Max(100)
  @ApiProperty({
    description: "Bin's filling level",
    example: 35,
    examples: [35, 78, 92],
  })
  filling_level: number;

  @Expose()
  @IsPositive()
  @Min(0)
  @Max(100)
  @ApiProperty({
    description: "Bin's battery level",
    example: 82,
    examples: [82, 64, 81],
  })
  battery_level: number;

  @Expose()
  @IsEnum(BinStatus)
  @ApiProperty({
    description: 'Bin Status',
    enum: BinStatus,
    example: BinStatus.ACTIVE,
    examples: [BinStatus.ACTIVE, BinStatus.UNVERIFIED, BinStatus.MAINTENANCE],
  })
  status: BinStatus;
}
