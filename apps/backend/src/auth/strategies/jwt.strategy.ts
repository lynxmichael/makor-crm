import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Les jetons à usage unique (défi 2FA, réinitialisation de mot de
    // passe) portent un champ `purpose` et ne doivent jamais être
    // acceptés comme jeton d'accès classique.
    if (payload?.purpose) {
      throw new UnauthorizedException('Jeton invalide pour cette opération.');
    }

    return this.usersService.findById(payload.sub);
  }
}