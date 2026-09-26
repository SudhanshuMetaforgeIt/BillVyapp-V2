import { Module } from '@nestjs/common';
import { ProductVendorsController } from './product-vendors.controller';
import { ProductVendorsService } from './product-vendors.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController, ProductVendorsController],
  providers: [ProductsService, ProductVendorsService],
  exports: [ProductsService, ProductVendorsService],
})
export class ProductsModule {}
