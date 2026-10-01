import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { BillDocumentsController } from './bill-documents.controller';
import { BillDocumentsService } from './bill-documents.service';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';

@Module({
  imports: [MediaModule],
  controllers: [BillsController, BillDocumentsController],
  providers: [BillsService, BillDocumentsService],
  exports: [BillsService, BillDocumentsService],
})
export class BillsModule {}
