import { Body, Controller, Post } from '@nestjs/common';
import { XsiEventsService } from './xsi-events.service';

@Controller('xsi-events')
export class XsiEventsController {
	constructor(private readonly xsiEventsService: XsiEventsService) {}

	@Post('webhook')
	handleEvent(@Body() payload: any) {
		console.log('XSI Event received:', payload);
		// Call the service to handle the event
		return { status: 'ok' };
	}
}
