import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { OTP } from 'otplib';
import * as qrcode from 'qrcode';
import type { StringValue } from 'ms';

import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';

import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TwoFactorLoginDto } from './dto/two-factor-login.dto';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/** Rôles pour lesquels la double authentification est obligatoire
 * (CDC §2.4, §8.2). Le backend ne bloque pas l'accès si elle n'est pas
 * encore configurée, mais le signale pour que le frontend impose sa
 * mise en place immédiate. */
const TWO_FACTOR_MANDATORY_ROLES = ['SUPER_ADMIN', 'ADMIN_VENTES', 'FINANCE'];

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly otp = new OTP({ strategy: 'totp' });

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  // -------------------------------------------------------------------
  // Helpers internes
  // -------------------------------------------------------------------

  private sanitizeUser(user: Record<string, any>) {
    const { password, twoFactorSecret, twoFactorRecoveryCodes, ...safe } =
      user;
    return safe;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private hashRecoveryCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private generateRecoveryCodes(count = 8) {
    const plain = Array.from({ length: count }, () =>
      crypto.randomBytes(5).toString('hex').toUpperCase(),
    );

    return { plain, hashed: plain.map((c) => this.hashRecoveryCode(c)) };
  }

  /** Parse une durée style "15m" / "7d" / "1h" en millisecondes. */
  private parseDurationMs(value: string): number {
    const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(value.trim());

    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2] ?? 's';

    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return amount * multipliers[unit];
  }

  /**
   * Secret de réinitialisation dérivé du mot de passe courant : un
   * changement de mot de passe invalide automatiquement tout lien de
   * réinitialisation émis auparavant, sans table dédiée.
   */
  private buildResetSecret(user: { password: string }): string {
    return `${this.config.getOrThrow<string>('JWT_SECRET')}:${user.password}`;
  }

  private async issueTokens(user: any, ctx: RequestContext) {
    const payload = { sub: user.id, email: user.email, roleId: user.roleId };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ??
        '15m') as StringValue,
    });

    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const refreshExpiresIn =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const expiresAt = new Date(
      Date.now() + this.parseDurationMs(refreshExpiresIn),
    );

    await this.usersService.createRefreshToken({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      expiresAt,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    });

    return {
      access_token: accessToken,
      refresh_token: rawRefreshToken,
      user: this.sanitizeUser(user),

      // Incite le frontend à imposer la mise en place de la 2FA pour les
      // rôles sensibles qui ne l'ont pas encore configurée.
      twoFactorSetupRequired:
        !user.twoFactorEnabled &&
        TWO_FACTOR_MANDATORY_ROLES.includes(user.role?.name),
    };
  }

  // -------------------------------------------------------------------
  // Connexion / déconnexion
  // -------------------------------------------------------------------

  async login(dto: LoginDto, ctx: RequestContext = {}) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60_000,
      );

      throw new UnauthorizedException(
        `Compte temporairement verrouillé suite à plusieurs échecs de connexion. Réessayez dans ${minutes} minute(s).`,
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    const validPassword = await argon2.verify(user.password, dto.password);

    if (!validPassword) {
      const updated = await this.usersService.registerFailedLogin(
        user.id,
        MAX_LOGIN_ATTEMPTS,
        LOCK_MINUTES,
      );

      if (updated.lockedUntil) {
        await this.mailService
          .sendAccountLocked(user.email)
          .catch(() => undefined);
      }

      await this.auditService.create({
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        description: 'Mot de passe incorrect',
        userId: user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (user.twoFactorEnabled) {
      const challengeToken = await this.jwtService.signAsync(
        { sub: user.id, purpose: '2fa_challenge' },
        {
          secret: this.config.getOrThrow<string>('JWT_SECRET'),
          expiresIn: '5m',
        },
      );

      return { requiresTwoFactor: true, challengeToken };
    }

    await this.usersService.resetFailedLogins(user.id);

    await this.auditService.create({
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      description: 'Connexion réussie',
      userId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.issueTokens(user, ctx);
  }

  /** Seconde étape de connexion pour les comptes avec 2FA activée. */
  async loginWithTwoFactor(dto: TwoFactorLoginDto, ctx: RequestContext = {}) {
    let payload: { sub: string; purpose: string };

    try {
      payload = await this.jwtService.verifyAsync(dto.challengeToken, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'Session de vérification expirée, reconnectez-vous.',
      );
    }

    if (payload.purpose !== '2fa_challenge') {
      throw new UnauthorizedException('Jeton de vérification invalide.');
    }

    const user = await this.usersService.findById(payload.sub);

    let valid = false;

    if (user.twoFactorSecret) {
      const result = await this.otp.verify({
        secret: user.twoFactorSecret,
        token: dto.code,
        epochTolerance: 1,
      });
      valid = result.valid;
    }

    if (!valid) {
      valid = await this.usersService.consumeRecoveryCode(
        user.id,
        this.hashRecoveryCode(dto.code.toUpperCase()),
      );
    }

    if (!valid) {
      await this.auditService.create({
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        description: 'Code de double authentification invalide',
        userId: user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      throw new UnauthorizedException('Code de vérification invalide.');
    }

    await this.usersService.resetFailedLogins(user.id);

    await this.auditService.create({
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      description: 'Connexion réussie (double authentification)',
      userId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.issueTokens(user, ctx);
  }

  async refresh(dto: RefreshTokenDto, ctx: RequestContext = {}) {
    const stored = await this.usersService.findRefreshTokenByHash(
      this.hashToken(dto.refreshToken),
    );

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expirée, reconnectez-vous.');
    }

    // Rotation : le jeton utilisé est immédiatement révoqué.
    await this.usersService.revokeRefreshToken(stored.id);

    if (!stored.user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    return this.issueTokens(stored.user, ctx);
  }

  async logout(dto: RefreshTokenDto) {
    const stored = await this.usersService.findRefreshTokenByHash(
      this.hashToken(dto.refreshToken),
    );

    if (stored) {
      await this.usersService.revokeRefreshToken(stored.id);
    }

    return { success: true };
  }

  /** Déconnexion de tous les appareils (ex : après changement de rôle). */
  async logoutAllDevices(userId: string) {
    await this.usersService.revokeAllUserRefreshTokens(userId);
    return { success: true };
  }

  // -------------------------------------------------------------------
  // Mot de passe oublié
  // -------------------------------------------------------------------

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    // Réponse identique que le compte existe ou non, pour ne pas
    // permettre l'énumération d'adresses email.
    if (user) {
      const token = await this.jwtService.signAsync(
        { sub: user.id, purpose: 'password_reset' },
        { secret: this.buildResetSecret(user), expiresIn: '1h' },
      );

      const link = `${this.config.get<string>('FRONTEND_URL') ?? ''}/reset-password?token=${token}`;

      await this.mailService
        .sendResetPassword(user.email, link)
        .catch(() => undefined);
    }

    return {
      message:
        'Si cette adresse existe, un email de réinitialisation vient de lui être envoyé.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const unverified = this.jwtService.decode(dto.token) as {
      sub?: string;
      purpose?: string;
    } | null;

    if (!unverified?.sub || unverified.purpose !== 'password_reset') {
      throw new BadRequestException('Lien de réinitialisation invalide.');
    }

    const user = await this.usersService.findById(unverified.sub);

    try {
      await this.jwtService.verifyAsync(dto.token, {
        secret: this.buildResetSecret(user),
      });
    } catch {
      throw new BadRequestException(
        'Lien de réinitialisation invalide ou expiré.',
      );
    }

    const hashed = await argon2.hash(dto.newPassword);
    await this.usersService.updatePassword(user.id, hashed);
    await this.usersService.revokeAllUserRefreshTokens(user.id);

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      description: 'Mot de passe réinitialisé',
      userId: user.id,
    });

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  // -------------------------------------------------------------------
  // Double authentification (CDC §2.4, §8.2)
  // -------------------------------------------------------------------

  async setupTwoFactor(userId: string) {
    const user = await this.usersService.findById(userId);

    const secret = this.otp.generateSecret();
    await this.usersService.setTwoFactorSecret(userId, secret);

    const otpauthUrl = this.otp.generateURI({
      issuer: 'MAKOR CRM',
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async enableTwoFactor(userId: string, dto: TwoFactorCodeDto) {
    const user = await this.usersService.findById(userId);

    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        'Initialisez la double authentification avant de l’activer.',
      );
    }

    if (
      !(
        await this.otp.verify({
          secret: user.twoFactorSecret,
          token: dto.code,
          epochTolerance: 1,
        })
      ).valid
    ) {
      throw new BadRequestException('Code de vérification invalide.');
    }

    const { plain, hashed } = this.generateRecoveryCodes();
    await this.usersService.enableTwoFactor(userId, hashed);

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      description: 'Double authentification activée',
      userId,
    });

    return {
      message:
        'Double authentification activée. Conservez ces codes de secours en lieu sûr : ils ne seront plus jamais affichés.',
      recoveryCodes: plain,
    };
  }

  async disableTwoFactor(userId: string, dto: TwoFactorCodeDto) {
    const user = await this.usersService.findById(userId);

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException(
        'La double authentification n’est pas activée.',
      );
    }

    if (
      !(
        await this.otp.verify({
          secret: user.twoFactorSecret,
          token: dto.code,
          epochTolerance: 1,
        })
      ).valid
    ) {
      throw new BadRequestException('Code de vérification invalide.');
    }

    await this.usersService.disableTwoFactor(userId);

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      description: 'Double authentification désactivée',
      userId,
    });

    return { success: true };
  }
}
