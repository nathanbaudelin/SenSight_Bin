import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ResponseStatusEnum } from 'src/tools/enums';

export class ResponseDto<T = any> {
  @IsEnum(ResponseStatusEnum)
  status: ResponseStatusEnum;

  @IsString()
  message: string;

  @IsOptional()
  data?: T;
}

export class ResponseSwaggerDto {
  @ApiProperty({
    description: 'Response status',
    enum: ResponseStatusEnum,
    example: 'status',
  })
  status: ResponseStatusEnum;

  @ApiProperty({ description: 'Response message' })
  message: string;
}
