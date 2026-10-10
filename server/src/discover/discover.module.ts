import { Module } from '@nestjs/common';
import { SolutionsService } from '../solutions/solutions.service.js';
import { RequestsService } from '../requests/requests.service.js';
import { RadarService } from '../radar/radar.service.js';
import { DiscoverController } from './discover.controller.js';

@Module({
  controllers: [DiscoverController],
  providers: [SolutionsService, RequestsService, RadarService],
})
export class DiscoverModule {}
