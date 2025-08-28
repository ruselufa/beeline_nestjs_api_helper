import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TranscriptionService } from './transcription.service';
import { TranscriptionController } from './transcription.controller';

@Module({
  imports: [HttpModule],
  controllers: [TranscriptionController],
  providers: [TranscriptionService],
  exports: [TranscriptionService],
})
export class TranscriptionModule {} 