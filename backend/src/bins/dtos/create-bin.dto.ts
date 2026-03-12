import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { BinStatus, BinType } from 'src/tools/enums';
import { Location } from 'src/tools/tools';

export class BinCreateDto {
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

  @IsPositive()
  @ApiProperty({
    description: 'Bin depth',
    example: 120,
    examples: [120, 100, 150],
  })
  depth: number;

  @IsPositive()
  @Min(0)
  @Max(100)
  @ApiProperty({
    description: "Bin's battery level",
    example: 82,
    examples: [82, 64, 81],
  })
  battery_level: number;

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
