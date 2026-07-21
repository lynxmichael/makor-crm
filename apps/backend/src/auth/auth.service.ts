import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException(
        'Email ou mot de passe incorrect',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Compte désactivé',
      );
    }

    const validPassword = await argon2.verify(
      user.password,
      dto.password,
    );

    if (!validPassword) {
      throw new UnauthorizedException(
        'Email ou mot de passe incorrect',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
    };

    const accessToken = await this.jwtService.signAsync(payload);

   const { password, refreshToken, ...safeUser } = user;

return {
  access_token: accessToken,
  user: safeUser,
};
  }
}