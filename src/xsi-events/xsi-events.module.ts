import { Module } from '@nestjs/common';
import { XsiEventsService } from './xsi-events.service';
import { XsiEventsController } from './xsi-events.controller';

@Module({
	controllers: [XsiEventsController],
	providers: [XsiEventsService],
})
export class XsiEventsModule {}
