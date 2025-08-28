import { Controller } from '@nestjs/common';
import { TelegramBotService } from './telegram_bot.service';

@Controller('telegram-bot')
export class TelegramBotController {
	constructor(private readonly telegramBotService: TelegramBotService) {}
}
