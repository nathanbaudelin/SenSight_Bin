import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
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
  Location,
  BinDto,
  BinCreateDto,
  BinUpdateDto,
  MeasurementDto,
  MeasurementCreateDto,
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
  async patchOneArtworkById(
    @Param('id') id: string,
    @Body() newArtwork: BinUpdateDto,
  ): Promise<void> {
    await this.binService.update(id, newArtwork);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete one bin by id.' })
  @ApiOkResponse({
    description: 'Artwork deleted',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @ApiNotFoundResponse({
    description: 'Id not found.',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @HttpCode(200)
  async deleteOneArtworkById(@Param('id') id: string): Promise<void> {
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
    const measurement: Measurement = await this.binService.registerMeasurement(
      binId,
      newMeasurement,
    );
    return await this.measurementService.create(measurement);
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
