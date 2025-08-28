import { Test, TestingModule } from '@nestjs/testing';
import { BeelineApiCallService } from './beeline_api_call.service';

describe('BeelineApiCallService', () => {
	let service: BeelineApiCallService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [BeelineApiCallService],
		}).compile();

		service = module.get<BeelineApiCallService>(BeelineApiCallService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
