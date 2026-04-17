import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RequestPredictionDto {
  @IsString()
  @ApiProperty({
    description: 'Bin id',
    example: 'BIN-001',
    examples: ['BIN-001', 'BIN-002', 'BIN-003'],
  })
  binId: string;

  @ApiProperty({
    description: 'History of the bin day, fill level and battery level',
    example: [
      [0, 0.15, 0.9], // start day, 15% fill level, 90% battery level
      [1, 0.15, 0.9], // day +1, 15% fill level, 90% battery level
      [2, 0.16, 0.9], // day +2, 16% fill level, 90% battery level
      '...', // and so on for the rest of the history
      [6, 0.82, 0.5], // day +6, 82% fill level, 50% battery level
    ],
  })
  history: [number, number, number][];
}
