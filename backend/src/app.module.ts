import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BinModule } from './bins/bin.module';
import { MeasurementModule } from './measurements/measurement.module';
import { AlertModule } from './alerts/alert.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PredictionModule } from './predictions/prediction.module';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'docker' ? '../.env' : '.env',
    }),
    MongooseModule.forRoot(
      process.env.MONGO_URL
        ? process.env.MONGO_URL
        : 'mongodb://mongodb:27017/sensight_bin',
    ),
    BinModule,
    MeasurementModule,
    AlertModule,
    PredictionModule,
    MonitoringModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
})
export class AppModule {}
