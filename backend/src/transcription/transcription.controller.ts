import { Controller, Post, Get, Param, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TranscriptionService } from './transcription.service';
import { TranscriptionResponse, TranscriptionStatus, TranscriptionMetrics } from './transcription.interface';

@Controller('transcription')
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('file'))
  async transcribeAudio(@UploadedFile() file: any): Promise<TranscriptionResponse> {
    return this.transcriptionService.transcribeAudio(file.path);
  }

  @Get('status/:fileId')
  async getStatus(@Param('fileId') fileId: string): Promise<TranscriptionStatus> {
    return this.transcriptionService.getStatus(fileId);
  }

  @Get('metrics')
  async getMetrics(): Promise<TranscriptionMetrics> {
    return this.transcriptionService.getMetrics();
  }

  @Get('download/:fileId')
  async downloadResult(@Param('fileId') fileId: string): Promise<string> {
    return this.transcriptionService.downloadResult(fileId);
  }
} 