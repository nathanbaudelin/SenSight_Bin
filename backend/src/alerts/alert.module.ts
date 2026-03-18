import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Alert, AlertSchema } from './alert.schema';
import { CounterModule } from 'src/counter/counter.module';
import { AlertController } from './alert.controller';
import { AlertService } from './alert.service';
import { BinModule } from 'src/bins/bin.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }]),
    CounterModule,
    BinModule,
  ],
  controllers: [AlertController],
  providers: [AlertService],
})
export class AlertModule {}
