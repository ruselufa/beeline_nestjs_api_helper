import { Test, TestingModule } from '@nestjs/testing';
import { TelegramBotController } from './telegram_bot.controller';
import { TelegramBotService } from './telegram_bot.service';

describe('TelegramBotController', () => {
	let controller: TelegramBotController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [TelegramBotController],
			providers: [TelegramBotService],
		}).compile();

		controller = module.get<TelegramBotController>(TelegramBotController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
