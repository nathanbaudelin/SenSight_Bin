import {
  Body,
  Controller,
  HttpCode,
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

@Controller('bins')
@ApiTags('bins')
@ApiExtraModels(
  ResponseSwaggerDto,
  // PaginatedContentSwaggerDto,
  // ArtworkQuerySwaggerDto,
  BinCreateDto,
  // ArtworkUpdateDto,
  BinDto,
)
@UseInterceptors(ResponseInterceptor)
export class BinController {
  constructor(private readonly binService: BinService) {}

  // @Get('types')
  // @ApiOperation({ summary: "Get the list of Artwork's types." })
  // @ApiOkResponse({
  //   description: 'List of all possible artwork types',
  //   ...responseWithEnumArray(ResponseSwaggerDto, ArtworkType),
  // })
  // getArtworkTypes(): ArtworkType[] {
  //   return Object.values(ArtworkType);
  // }

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

  // @Get()
  // @ApiOperation({ summary: 'Get all artworks.' })
  // @ApiQuery({ type: ArtworkQuerySwaggerDto })
  // @ApiOkResponse({
  //   description: 'Artworks found',
  //   ...responseWithOptionalData(
  //     ResponseSwaggerDto,
  //     [ArtworkFullDto, ArtworkMiniDto],
  //     PaginatedContentSwaggerDto,
  //   ),
  // })
  // @HttpCode(200)
  // async getArtworks(
  //   @Query() query?: ArtworkQueryDto,
  // ): Promise<PaginatedContentDto<ArtworkFullDto | ArtworkMiniDto>> {
  //   return this.artworkService.findAll(query);
  // }

  // @Get(':id')
  // @ApiOperation({ summary: 'Get one artwork by id.' })
  // @ApiOkResponse({
  //   description: 'Artwork found',
  //   ...responseWithOptionalData(ResponseSwaggerDto, [
  //     ArtworkFullDto,
  //     ArtworkMiniDto,
  //   ]),
  // })
  // @ApiNotFoundResponse({
  //   description: 'Id not found.',
  //   ...responseWithOptionalData(ResponseSwaggerDto),
  // })
  // @HttpCode(200)
  // async getOneArtworkById(
  //   @Param('id', UuidV4Pipe)
  //   id: string,
  //   @Query() query?: ViewDto,
  // ): Promise<ArtworkFullDto | ArtworkMiniDto> {
  //   return this.artworkService.findOneId(id, query);
  // }

  // @Patch(':id')
  // @ApiOperation({ summary: 'Update one artwork by id.' })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({ type: ArtworkUpdateDto })
  // @ApiOkResponse({
  //   description: 'Artwork updated',
  //   ...responseWithOptionalData(ResponseSwaggerDto),
  // })
  // @ApiNotFoundResponse({
  //   description: 'Id not found.',
  //   ...responseWithOptionalData(ResponseSwaggerDto),
  // })
  // @HttpCode(200)
  // @UseInterceptors(FileInterceptor('picture'))
  // async patchOneArtworkById(
  //   @Param('id', UuidV4Pipe) id: string,
  //   @Body() newArtwork: ArtworkUpdateDto,
  //   @UploadedFile() file?: Express.Multer.File,
  // ): Promise<void> {
  //   await this.artworkService.update(id, newArtwork, file);
  // }

  // @Put(':id')
  // @ApiOperation({ summary: 'Replace one artwork by id.' })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({ type: ArtworkCreateDto })
  // @ApiOkResponse({
  //   description: 'Artwork updated',
  //   ...responseWithOptionalData(ResponseSwaggerDto),
  // })
  // @ApiNotFoundResponse({
  //   description: 'Id not found.',
  //   ...responseWithOptionalData(ResponseSwaggerDto),
  // })
  // @HttpCode(200)
  // @UseInterceptors(FileInterceptor('picture'))
  // async replaceOneArtworkById(
  //   @Param('id', UuidV4Pipe) id: string,
  //   @Body() newArtwork: ArtworkCreateDto,
  //   @UploadedFile() file?: Express.Multer.File,
  // ): Promise<void> {
  //   await this.artworkService.update(id, newArtwork, file);
  // }

  // @Delete(':id')
  // @ApiOperation({ summary: 'Delete one artwork by id.' })
  // @ApiOkResponse({
  //   description: 'Artwork deleted',
  //   ...responseWithOptionalData(ResponseSwaggerDto),
  // })
  // @ApiNotFoundResponse({
  //   description: 'Id not found.',
  //   ...responseWithOptionalData(ResponseSwaggerDto),
  // })
  // @HttpCode(200)
  // async deleteOneArtworkById(
  //   @Param('id', UuidV4Pipe) id: string,
  // ): Promise<void> {
  //   await this.artworkService.remove(id);
  // }

  // @Delete()
  // @ApiOperation({ summary: 'Delete many artworks by ids.' })
  // @ApiOkResponse({
  //   description: 'Artworks deleted',
  //   ...responseWithOptionalData(ResponseSwaggerDto),
  // })
  // @ApiNotFoundResponse({
  //   description: 'Id not found.',
  //   ...responseWithOptionalData(ResponseSwaggerDto),
  // })
  // @HttpCode(200)
  // async deleteManyArtworksById(
  //   @Body(new UuidV4ArrayPipe()) ids: string[],
  // ): Promise<void> {
  //   await this.artworkService.removeMany(ids);
  // }
}
