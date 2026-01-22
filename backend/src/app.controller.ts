import { Controller, Get, Post, Body } from '@nestjs/common';

interface Bin {
  bin_id: string;
  current_fill: number;
}

interface OptimizeRequest {
  bins: Bin[];
}

interface OptimizeResponse {
  algorithm: string;
  route: { bin_id: string; current_fill: number }[];
}

@Controller()
export class AppController {
  @Get()
  ping() {
    return { status: 'backend ok' };
  }

  @Post('measurements')
  createMeasurement(@Body() body: Bin) {
    console.log('Measurement received:', body);
    return { received: true };
  }

  @Post('ai/test')
  async testAI(@Body() body: OptimizeRequest) {
    const aiUrl = process.env.AI_URL;
    const res: Response = await fetch(`${aiUrl}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data: OptimizeResponse = (await res.json()) as OptimizeResponse;
    return data;
  }
}
