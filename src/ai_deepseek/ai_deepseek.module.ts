import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiDeepseekService } from './ai_deepseek.service';

@Module({
  imports: [HttpModule],
  providers: [AiDeepseekService],
  exports: [AiDeepseekService],
})
export class AiDeepseekModule {} 