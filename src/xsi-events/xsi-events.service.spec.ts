import { Test, TestingModule } from '@nestjs/testing';
import { XsiEventsService } from './xsi-events.service';

describe('XsiEventsService', () => {
	let service: XsiEventsService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [XsiEventsService],
		}).compile();

		service = module.get<XsiEventsService>(XsiEventsService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
