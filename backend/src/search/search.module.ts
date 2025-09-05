import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { AnalyzedAi } from '../entities/beeline/analyzed_ai.entity';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyzedAi, AbonentRecord]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
