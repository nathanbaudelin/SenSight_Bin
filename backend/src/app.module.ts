import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

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
  ],
  controllers: [AppController],
})
export class AppModule {}
