import { Injectable } from '@nestjs/common';
import { Command, Ctx, Start, Update, Hears } from 'nestjs-telegraf';
import { BeelineApiCallService } from 'src/beeline_api_call/beeline_api_call.service';
import { Context } from 'telegraf';

@Update()
@Injectable()
export class TelegramBotService {
	constructor(private readonly beelineApiCallService: BeelineApiCallService) {}
	@Start()
	async onStart(@Ctx() ctx: Context) {
		await ctx.reply('Привет! Я готов к работе!');
	}

	@Command('ping')
	async onPing(@Ctx() ctx: Context) {
		await ctx.reply('Pong!');
	}

	@Hears('привет')
	async onHello(@Ctx() ctx: Context) {
		await ctx.reply('Привет, чем могу помочь?');
	}

	@Command('abonents')
	async onGetAbonents(@Ctx() ctx: Context) {
		try {
			const abonents = await this.beelineApiCallService.getAllAbonents();
			const formattedAbonent = abonents[0];
			await ctx.reply(
				`Количество абонентов: ${abonents.length},
Уникальных департаментов: ${abonents.map((abonent) => abonent.department).filter((department, index, self) => self.indexOf(department) === index).length}
Департаменты: ${abonents
					.map((abonent) => abonent.department)
					.filter((department, index, self) => self.indexOf(department) === index)
					.join('; ')}
ID: ${formattedAbonent.userId},
Phone: ${formattedAbonent.phone},
FirstName: ${formattedAbonent.firstName},
LastName: ${formattedAbonent.lastName ? formattedAbonent.lastName : 'N/A'},
Department: ${formattedAbonent.department},
Extension: ${formattedAbonent.extension}`,
			);

			// const formattedAbonents = abonents.map(
			// 	(abonent) =>
			// 		`ID: ${abonent.userId}, Phone: ${abonent.phone}, Name: ${abonent.firstName} ${abonent.lastName}, Department: ${abonent.department}, Extension: ${abonent.extension}`,
			// );
			// await ctx.reply(formattedAbonents.join('\n'));
		} catch (error: unknown) {
			if (error instanceof Error) {
				await ctx.reply(`Ошибка запроса абонентов: ${error.message}`);
			} else {
				await ctx.reply('Произошла неизвестная ошибка при запросе абонентов');
			}
		}
	}

	@Command('record')
	async onGetRecord(@Ctx() ctx: Context) {
		try {
			const recordId = '70592786'; // Можно позже распарсить из сообщения

			// 1. Получаем описание
			const details = await this.beelineApiCallService.getRecordInfo(recordId);
			// rawDate 1730955939531
			const formattedDate = new Date(details.date).toLocaleString('ru-RU', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			});
			const formattedFileSize = Number((details.fileSize / 1024 / 1024).toFixed(2)); // Форматируем размер файла в КБ
			details.fileSize = formattedFileSize; // Заменяем на отформатированный размер файла
			details.date = formattedDate; // Заменяем на отформатированную дату
			// Duration: 20 мин 30 сек
			const durationInSeconds = Math.round(details.duration / 1000); // Переводим в секунды
			const minutes = Math.floor(durationInSeconds / 60); // Получаем минуты
			const seconds = durationInSeconds % 60; // Получаем секунды
			const formattedDuration = `${minutes} мин ${seconds} сек`; // Форматируем в строку
			// 2. Формируем сообщение
			const msg = `📄 Информация о записи:
🆔 ID: ${details.id}
📞 Номер: ${details.phone}
👤 Абонент: ${details.abonent.firstName} ${details.abonent.lastName ? details.abonent.lastName : ''}
📅 Дата: ${details.date}
⏱️ Длительность: ${formattedDuration}
💾 Размер файла: ${details.fileSize} Мбайт
📝 Комментарий: ${details.comment || 'отсутствует'}`;

			await ctx.reply(msg); // <-- не забудь!

			// 3. Получаем файл
			const mp3Buffer = await this.beelineApiCallService.getRecordFile(recordId);

			// 4. Отправляем mp3 в Telegram
			await ctx.replyWithAudio(
				{ source: mp3Buffer, filename: 'call_recording.mp3' },
				{ caption: 'Вот ваша запись 📞' },
			);
		} catch (error: unknown) {
			if (error instanceof Error) {
				await ctx.reply('Ошибка при получении записи: ' + error.message);
			} else {
				await ctx.reply('Произошла неизвестная ошибка при запросе записи');
			}
		}
	}
}
