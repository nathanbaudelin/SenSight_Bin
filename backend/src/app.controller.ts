import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('System')
export class AppController {
  constructor() {}

  @Get('health')
  health() {
    return { status: 'backend ok' };
  }
}
