import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleSheetsConfigService } from './google-sheets-config.service';

@Module({
	imports: [ConfigModule],
	providers: [GoogleSheetsService, GoogleSheetsConfigService],
	exports: [GoogleSheetsService, GoogleSheetsConfigService]
})
export class GoogleSheetsModule {} 