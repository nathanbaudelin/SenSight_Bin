import {
  Controller,
  Get,
  HttpCode,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PredictionDto } from './dtos/response-prediction.dto';
import { PredictionService } from './prediction.service';
import { ResponseSwaggerDto } from 'src/tools/response.dto';
import { ResponseInterceptor } from 'src/tools/response.interceptor';
import { responseWithOptionalData } from 'src/tools/swagger-tools';

@Controller('predictions')
@ApiTags('Predictions')
@ApiExtraModels(ResponseSwaggerDto, PredictionDto)
@UseInterceptors(ResponseInterceptor)
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get predictions for a specific bin.' })
  @ApiOkResponse({
    description: 'Predictions calculated',
    ...responseWithOptionalData(ResponseSwaggerDto, PredictionDto),
  })
  @HttpCode(200)
  getPredictionsForBin(@Param('id') id: string): Promise<PredictionDto> {
    return this.predictionService.getPredictionsForBin(id);
  }
}
