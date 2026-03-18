import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseSwaggerDto } from 'src/tools/response.dto';
import { AlertDto } from './dtos/response-alert.dto';
import { AlertCreateDto } from './dtos/create-alert.dto';
import { AlertUpdateDto } from './dtos/update-alert.dot';
import { AlertQueryDto, AlertQuerySwaggerDto } from './dtos/query-alert.dto';
import { ResponseInterceptor } from 'src/tools/response.interceptor';
import { AlertService } from './alert.service';
import { responseWithOptionalData } from 'src/tools/swagger-tools';
import {
  PaginatedContentDto,
  PaginatedContentSwaggerDto,
} from 'src/tools/pagination.dto';
import { BinService } from 'src/bins/bin.service';

@Controller('alerts')
@ApiTags('Alerts')
@ApiExtraModels(
  ResponseSwaggerDto,
  PaginatedContentSwaggerDto,
  AlertDto,
  AlertQuerySwaggerDto,
  AlertCreateDto,
  AlertUpdateDto,
)
@UseInterceptors(ResponseInterceptor)
export class AlertController {
  constructor(
    private readonly alertService: AlertService,
    private readonly binService: BinService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all alerts.' })
  @ApiQuery({ type: AlertQuerySwaggerDto })
  @ApiOkResponse({
    description: 'Alerts found',
    ...responseWithOptionalData(
      ResponseSwaggerDto,
      AlertDto,
      PaginatedContentSwaggerDto,
    ),
  })
  @HttpCode(200)
  async getAlerts(
    @Query() query?: AlertQueryDto,
  ): Promise<PaginatedContentDto<AlertDto>> {
    if (query?.binId) await this.binService.findOneId(query.binId);
    return await this.alertService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one alert by id.' })
  @ApiOkResponse({
    description: 'Alert found',
    ...responseWithOptionalData(ResponseSwaggerDto, AlertDto),
  })
  @ApiNotFoundResponse({
    description: 'Id not found.',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @HttpCode(200)
  async getOneAlertById(
    @Param('id')
    id: string,
  ): Promise<AlertDto> {
    return await this.alertService.findOneId(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update one alert by id.' })
  @ApiBody({ type: AlertUpdateDto })
  @ApiOkResponse({
    description: 'Alert updated',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @ApiNotFoundResponse({
    description: 'Id not found.',
    ...responseWithOptionalData(ResponseSwaggerDto),
  })
  @HttpCode(200)
  async patchOneAlertById(
    @Param('id') id: string,
    @Body() newAlert: AlertUpdateDto,
  ): Promise<void> {
    await this.alertService.update(id, newAlert);
  }
}
