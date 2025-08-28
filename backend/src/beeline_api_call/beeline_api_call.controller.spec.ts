import { Test, TestingModule } from '@nestjs/testing';
import { BeelineApiCallController } from './beeline_api_call.controller';
import { BeelineApiCallService } from './beeline_api_call.service';

describe('BeelineApiCallController', () => {
	let controller: BeelineApiCallController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [BeelineApiCallController],
			providers: [BeelineApiCallService],
		}).compile();

		controller = module.get<BeelineApiCallController>(BeelineApiCallController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
