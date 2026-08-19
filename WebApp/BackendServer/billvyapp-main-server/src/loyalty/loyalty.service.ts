import { Injectable } from '@nestjs/common';
import { ScopeService } from '../common/scope/scope.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PHASE 1 SKELETON.
 *
 * Wired into DI with the dependencies every business service needs:
 *   - PrismaService for data access (no other DB connection is permitted)
 *   - ScopeService to constrain every query to the caller's franchise/salon
 *
 * Operations are added in Phase 2. Each read must be filtered through
 * ScopeService, and each write must verify ownership before mutating.
 */
@Injectable()
export class LoyaltyService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
  ) {}
}
