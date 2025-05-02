import { Test, TestingModule } from '@nestjs/testing';
import { XsiEventsController } from './xsi-events.controller';
import { XsiEventsService } from './xsi-events.service';

describe('XsiEventsController', () => {
	let controller: XsiEventsController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [XsiEventsController],
			providers: [XsiEventsService],
		}).compile();

		controller = module.get<XsiEventsController>(XsiEventsController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
