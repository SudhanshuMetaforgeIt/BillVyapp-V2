import { Module } from '@nestjs/common';
import { BillUpiService } from './bill-upi.service';
import { BillUpiController } from './bill-upi.controller';
import { MediaModule } from '../media/media.module';
import { BillDocumentsController } from './bill-documents.controller';
import { BillDocumentsService } from './bill-documents.service';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';

@Module({
  imports: [MediaModule],
  controllers: [BillsController, BillDocumentsController, BillUpiController],
  providers: [BillsService, BillDocumentsService, BillUpiService],
  exports: [BillsService, BillDocumentsService],
})
export class BillsModule {}
