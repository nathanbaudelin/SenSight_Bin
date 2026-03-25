import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BinService } from './bins/bin.service';

// class DeviceRegisterDto {
//   @IsString()
//   device_uid: string;

//   @IsOptional()
//   @IsPositive()
//   depth?: number;

//   @IsOptional()
//   @IsPositive()
//   battery_level?: number;
// }

@Controller()
@ApiTags('System')
export class AppController {
  // private readonly logger = new Logger(AppController.name);

  constructor(private readonly binService: BinService) {}

  @Get('health')
  health() {
    return { status: 'backend ok' };
  }

  // @Post('devices/register')
  // @ApiOperation({ summary: 'Register a device and return its bin id.' })
  // @ApiBody({ type: DeviceRegisterDto })
  // async registerDevice(@Body() payload: DeviceRegisterDto) {
  //   this.logger.log(
  //     `Device register request received for uid=${payload.device_uid}, depth=${payload.depth ?? 'default'}, battery=${payload.battery_level ?? 'default'}`,
  //   );

  //   const bin = await this.binService.registerDevice(payload);

  //   this.logger.log(
  //     `Device uid=${payload.device_uid} mapped to bin=${bin.id}, status=${bin.status}, depth=${bin.depth}`,
  //   );

  //   return {
  //     bin_id: bin.id,
  //     depth: bin.depth,
  //     status: bin.status,
  //   };
  // }
}
