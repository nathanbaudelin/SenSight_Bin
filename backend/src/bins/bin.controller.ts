import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BinCreateDto } from './dtos/create-bin.dto';
import { BinService } from './bin.service';
import { ResponseInterceptor } from 'src/tools/response.interceptor';
import { responseWithOptionalData } from 'src/tools/swagger-tools';
import { ResponseSwaggerDto } from 'src/tools/response.dto';
import { BinDto } from './dtos/response-bin.dto';
import { MeasurementCreateDto } from 'src/measurements/dtos/create-measurement.dto';
import { MeasurementDto } from 'src/measurements/dtos/response-measurement.dto';
import { MeasurementService } from 'src/measurements/measurement.service';
import { Measurement } from 'src/measurements/measurement.schema';

@Controller('bins')
@ApiTags('Bins')
@ApiExtraModels(
  ResponseSwaggerDto,
  BinCreateDto,
  BinDto,
  MeasurementCreateDto,
  MeasurementDto,
)
@UseInterceptors(ResponseInterceptor)
export class BinController {
  constructor(
    private readonly binService: BinService,
    private readonly measurementService: MeasurementService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bin.' })
  @ApiBody({ type: BinCreateDto })
  @ApiCreatedResponse({
    description: 'Bin created',
    ...responseWithOptionalData(ResponseSwaggerDto, BinDto),
  })
  @ApiBadRequestResponse({
    description: 'Invalid body',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @HttpCode(201)
  async createBin(@Body() newBin: BinCreateDto): Promise<BinDto> {
    return await this.binService.create(newBin);
  }

  @Post('/:id/measurements')
  @ApiOperation({ summary: 'Register a new measurement.' })
  @ApiBody({ type: MeasurementCreateDto })
  @ApiCreatedResponse({
    description: 'Measurement registered',
    ...responseWithOptionalData(ResponseSwaggerDto, MeasurementDto),
  })
  @ApiBadRequestResponse({
    description: 'Invalid body',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @HttpCode(201)
  async registerMeasurement(
    @Param('id') binId: string,
    @Body() newMeasurement: MeasurementCreateDto,
  ): Promise<MeasurementDto> {
    const measurement: Measurement = await this.binService.registerMeasurement(
      binId,
      newMeasurement,
    );
    return await this.measurementService.create(measurement);
  }
}
