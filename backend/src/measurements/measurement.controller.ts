import {
  Controller,
  Get,
  HttpCode,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseSwaggerDto } from 'src/tools/response.dto';
import { MeasurementDto } from './dtos/response-measurement.dto';
import { ResponseInterceptor } from 'src/tools/response.interceptor';
import { MeasurementService } from './measurement.service';
import {
  MeasurementQueryDto,
  MeasurementQuerySwaggerDto,
} from './dtos/query-measurement.dto';
import { responseWithOptionalData } from 'src/tools/swagger-tools';
import {
  PaginatedContentDto,
  PaginatedContentSwaggerDto,
} from 'src/tools/pagination.dto';

@Controller('measurements')
@ApiTags('Measurements')
@ApiExtraModels(ResponseSwaggerDto, MeasurementDto, MeasurementQuerySwaggerDto)
@UseInterceptors(ResponseInterceptor)
export class MeasurementController {
  constructor(private readonly measurementService: MeasurementService) {}

  @Get()
  @ApiOperation({ summary: 'Get all measurements.' })
  @ApiQuery({ type: MeasurementQuerySwaggerDto })
  @ApiOkResponse({
    description: 'Measurements found',
    ...responseWithOptionalData(
      ResponseSwaggerDto,
      MeasurementDto,
      PaginatedContentSwaggerDto,
    ),
  })
  @HttpCode(200)
  async getMeasurements(
    @Query() query?: MeasurementQueryDto,
  ): Promise<PaginatedContentDto<MeasurementDto>> {
    return await this.measurementService.findAll(query);
  }
}
