import { Module } from '@nestjs/common';
import { TelegramBotService } from './telegram_bot.service';
import { TelegramBotController } from './telegram_bot.controller';
import { BeelineApiCallModule } from 'src/beeline_api_call/beeline_api_call.module';

@Module({
	controllers: [TelegramBotController],
	providers: [TelegramBotService],
	exports: [TelegramBotService],
	imports: [BeelineApiCallModule],
})
export class TelegramBotModule {}
