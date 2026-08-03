import {
  Body,
  Controller,
  Ip,
  Headers,
  Post,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService, RequestContext } from './auth.service';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TwoFactorLoginDto } from './dto/two-factor-login.dto';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  private ctx(ip?: string, userAgent?: string): RequestContext {
    return { ipAddress: ip, userAgent };
  }

  @Post('login')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Connexion. Renvoie soit les jetons de session, soit un défi 2FA ' +
      'si la double authentification est activée pour ce compte.',
  })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.login(dto, this.ctx(ip, userAgent));
  }

  @Post('login/2fa')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Seconde étape de connexion (code TOTP ou code de secours)' })
  async loginTwoFactor(
    @Body() dto: TwoFactorLoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.loginWithTwoFactor(dto, this.ctx(ip, userAgent));
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renouveler la session à partir du refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.refresh(dto, this.ctx(ip, userAgent));
  }

  @Post('logout')
  @ApiOperation({ summary: 'Déconnexion de l’appareil courant' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }

  @Post('logout-all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Déconnexion de tous les appareils' })
  async logoutAll(@CurrentUser() user: { id: string }) {
    return this.authService.logoutAllDevices(user.id);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Demander un lien de réinitialisation de mot de passe' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Réinitialiser le mot de passe à partir du lien reçu par email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('2fa/setup')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Initialiser la double authentification (génère le secret et le QR code)',
  })
  async setupTwoFactor(@CurrentUser() user: { id: string }, @Query('regenerate') regenerate?: string) {
    return this.authService.setupTwoFactor(user.id, regenerate === 'true');
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Confirmer et activer la double authentification',
  })
  async enableTwoFactor(
    @CurrentUser() user: { id: string },
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.authService.enableTwoFactor(user.id, dto);
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Désactiver la double authentification' })
  async disableTwoFactor(
    @CurrentUser() user: { id: string },
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.authService.disableTwoFactor(user.id, dto);
  }

  @Post('2fa/reset/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary:
      'Réinitialiser la 2FA d’un autre compte (perte de téléphone, ou tests)',
  })
  resetTwoFactorFor(
    @Param('userId') userId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.authService.resetTwoFactorFor(userId, user.id);
  }

}
