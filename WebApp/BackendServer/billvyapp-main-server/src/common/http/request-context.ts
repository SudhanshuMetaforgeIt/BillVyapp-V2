import type { Request } from 'express';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function requestContext(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}
