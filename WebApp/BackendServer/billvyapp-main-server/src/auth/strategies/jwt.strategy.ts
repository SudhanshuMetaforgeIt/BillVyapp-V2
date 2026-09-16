/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
//
// passport-jwt ships no type declarations and @types/passport-jwt is NOT
// installed in this project, so ExtractJwt and Strategy resolve as untyped.
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_TYPE_ACCESS } from '../auth.constants';
import { RoleCode } from '../../common/enums/role.enum';
import {
  AuthenticatedUser,
  JwtAccessPayload,
} from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from '../session.service';

/**
 * Validates the access token, then re-checks the account against the database.
 *
 * Role, franchiseId and salonId are taken from the current User row, never
 * from the token body. A signature-only check would keep honouring tokens
 * belonging to accounts that have since been deactivated or logged out.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    if (payload.type !== JWT_TYPE_ACCESS || !payload.sub) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        franchiseId: true,
        salonId: true,
        role: { select: { code: true, isActive: true } },
      },
    });

    if (!user || !user.isActive || !user.role.isActive) {
      throw new UnauthorizedException('Authentication required');
    }

    if (
      payload.sessionId &&
      !(await this.sessions.isActive(payload.sessionId))
    ) {
      throw new UnauthorizedException('Authentication required');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role.code as RoleCode,
      franchiseId: user.franchiseId,
      salonId: user.salonId,
      sessionId: payload.sessionId ?? null,
    };
  }
}
