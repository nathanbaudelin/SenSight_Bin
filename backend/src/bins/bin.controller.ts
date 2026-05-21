import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
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
import { BinUpdateDto } from './dtos/update-bin.dto';
import { BinStatus } from 'src/tools/enums';
import { BinQueryDto, BinQuerySwaggerDto } from './dtos/query-bin.dto';
import {
  PaginatedContentDto,
  PaginatedContentSwaggerDto,
} from 'src/tools/pagination.dto';
import { Location } from 'src/tools/tools';

@Controller('bins')
@ApiTags('Bins')
@ApiExtraModels(
  ResponseSwaggerDto,
  PaginatedContentSwaggerDto,
  Location,
  BinDto,
  BinQuerySwaggerDto,
  BinCreateDto,
  BinUpdateDto,
  MeasurementDto,
  MeasurementCreateDto,
)
@UseInterceptors(ResponseInterceptor)
export class BinController {
  private readonly logger = new Logger(BinController.name);

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
    this.logger.log(
      `POST /bins called device_uid=${newBin.device_uid ?? 'n/a'} depth=${newBin.depth} battery=${newBin.battery_level} status=${newBin.status ?? 'default'}`,
    );
    try {
      const created = await this.binService.create(newBin);
      this.logger.log(`POST /bins success id=${created.id}`);
      return created;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`POST /bins failed: ${message}`, stack);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all bins.' })
  @ApiQuery({ type: BinQuerySwaggerDto })
  @ApiOkResponse({
    description: 'Bins found',
    ...responseWithOptionalData(
      ResponseSwaggerDto,
      BinDto,
      PaginatedContentSwaggerDto,
    ),
  })
  @HttpCode(200)
  async getBins(
    @Query() query?: BinQueryDto,
  ): Promise<PaginatedContentDto<BinDto>> {
    return await this.binService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one bin by id.' })
  @ApiOkResponse({
    description: 'Bin found',
    ...responseWithOptionalData(ResponseSwaggerDto, BinDto),
  })
  @ApiNotFoundResponse({
    description: 'Id not found.',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @HttpCode(200)
  async getOneBinById(
    @Param('id')
    id: string,
  ): Promise<BinDto> {
    return await this.binService.findOneId(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update one bin by id.' })
  @ApiBody({ type: BinUpdateDto })
  @ApiOkResponse({
    description: 'Bin updated',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @ApiNotFoundResponse({
    description: 'Id not found.',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @HttpCode(200)
  async patchOneBinById(
    @Param('id') id: string,
    @Body() newBin: BinUpdateDto,
  ): Promise<void> {
    await this.binService.update(id, newBin);
  }

  @Put(':id/factory-reset')
  @ApiOperation({ summary: 'Factory reset one bin by id.' })
  @ApiOkResponse({
    description: 'Bin reset',
    ...responseWithOptionalData(ResponseSwaggerDto, BinDto),
  })
  @ApiNotFoundResponse({
    description: 'Id not found.',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @HttpCode(200)
  async factoryResetBinById(
    @Param('id') id: string,
    @Query('purgeHistory') purgeHistory?: string,
  ): Promise<BinDto> {
    const shouldPurgeHistory = purgeHistory === 'true';
    this.logger.log(
      `PUT /bins/${id}/factory-reset called purgeHistory=${shouldPurgeHistory}`,
    );
    try {
      const reset = await this.binService.factoryReset(id, shouldPurgeHistory);
      this.logger.log(`PUT /bins/${id}/factory-reset success`);
      return reset;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`PUT /bins/${id}/factory-reset failed: ${message}`, stack);
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete one bin by id.' })
  @ApiOkResponse({
    description: 'Bin deleted',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @ApiNotFoundResponse({
    description: 'Id not found.',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @HttpCode(200)
  async deleteOneBinById(@Param('id') id: string): Promise<void> {
    await this.binService.update(id, { status: BinStatus.REMOVED });
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
    this.logger.log(
      `POST /bins/${binId}/measurements called raw=${newMeasurement.filling_level} battery=${newMeasurement.battery_level}`,
    );
    try {
      const measurement: Measurement = await this.binService.registerMeasurement(
        binId,
        newMeasurement,
      );
      const saved = await this.measurementService.create(measurement);
      this.logger.log(
        `POST /bins/${binId}/measurements success fill=${measurement.filling_level} battery=${measurement.battery_level}`,
      );
      return saved;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `POST /bins/${binId}/measurements failed: ${message}`,
        stack,
      );
      throw error;
    }
  }

  @Get('/:id/measurements')
  @ApiOperation({ summary: 'Get all measurements of the bin.' })
  @ApiOkResponse({
    description: 'Measurements found',
    ...responseWithOptionalData(
      ResponseSwaggerDto,
      MeasurementDto,
      PaginatedContentSwaggerDto,
    ),
  })
  @HttpCode(200)
  async getBinMeasurements(
    @Param('id') binId: string,
  ): Promise<PaginatedContentDto<MeasurementDto>> {
    await this.binService.findOneId(binId);
    return await this.measurementService.findAll({}, binId);
  }
}
