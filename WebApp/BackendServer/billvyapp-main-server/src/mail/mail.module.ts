import { Global, Module } from '@nestjs/common';
import { GraphMailService } from './graph-mail.service';
import { MailOutboxService } from './mail-outbox.service';
@Global()
@Module({
  providers: [GraphMailService, MailOutboxService],
  exports: [GraphMailService, MailOutboxService],
})
export class MailModule {}
