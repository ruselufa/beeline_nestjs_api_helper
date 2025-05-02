import { Controller } from '@nestjs/common';
import { BeelineApiCallService } from './beeline_api_call.service';

@Controller('beeline-api-call')
export class BeelineApiCallController {
	constructor(private readonly beelineApiCallService: BeelineApiCallService) {}
}
