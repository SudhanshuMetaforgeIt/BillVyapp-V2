import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { requestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { BillDocumentsService } from './bill-documents.service';
import {
  BillDocumentResponseDto,
  PaginatedBillDocumentsDto,
} from './dto/bill-document-response.dto';
import { CreateBillDocumentDto } from './dto/create-bill-document.dto';

const DOCUMENT_READ_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

const DOCUMENT_WRITE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
] as const;

@ApiTags('Bill Documents')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role or bill scope' })
@Controller('bills/:billId/documents')
export class BillDocumentsController {
  constructor(private readonly documentsService: BillDocumentsService) {}

  @Get()
  @Roles(...DOCUMENT_READ_ROLES)
  @ApiOperation({
    summary: 'List documents for a bill',
    description:
      'CUSTOMER callers may only list documents on their own bills. Staff roles require salon scope.',
  })
  @ApiResponse({ status: 200, type: PaginatedBillDocumentsDto })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('billId', ParseUUIDPipe) billId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.documentsService.list(user, billId, query.page, query.limit);
  }

  @Post()
  @Roles(...DOCUMENT_WRITE_ROLES)
  @ApiOperation({
    summary: 'Attach a bill document from an uploaded MediaFile',
    description:
      'Copies storageKey, fileName, mimeType and fileSize from the MediaFile after verifying media and bill access.',
  })
  @ApiResponse({ status: 201, type: BillDocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Bill or media file not found' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('billId', ParseUUIDPipe) billId: string,
    @Body() dto: CreateBillDocumentDto,
    @Req() req: Request,
  ) {
    return this.documentsService.create(
      user,
      billId,
      dto,
      requestContext(req),
    );
  }

  @Get(':id/download-url')
  @Roles(...DOCUMENT_READ_ROLES)
  @ApiOperation({
    summary: 'Create a private presigned download URL for a bill document',
  })
  createDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('billId', ParseUUIDPipe) billId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.createDownloadUrl(user, billId, id);
  }

  @Get(':id')
  @Roles(...DOCUMENT_READ_ROLES)
  @ApiOperation({ summary: 'Get a bill document by id' })
  @ApiResponse({ status: 200, type: BillDocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Bill or document not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('billId', ParseUUIDPipe) billId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.findOne(user, billId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(...DOCUMENT_WRITE_ROLES)
  @ApiOperation({
    summary: 'Delete a bill document',
    description:
      'Removes the BillDocument metadata row. The underlying MediaFile / object storage blob is not deleted.',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Bill or document not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('billId', ParseUUIDPipe) billId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.documentsService.remove(
      user,
      billId,
      id,
      requestContext(req),
    );
  }
}
