import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TwoFactorPolicy } from '../auth/two-factor.policy';

@Controller('users')
// Lecture ouverte à tout compte connecté — la liste des collègues sert
// aux sélecteurs d'affectation et de destinataire. Les écritures sont
// restreintes route par route (CDC §7).
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly twoFactorPolicy: TwoFactorPolicy,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN')
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: any) {
    return this.usersService.create(dto, actor?.role?.name);
  }

  /**
   * Profil du compte connecté.
   *
   * `twoFactorSetupRequired` est calculé ici et nulle part ailleurs : c'est
   * le serveur qui détient la règle, y compris l'échappatoire
   * TWO_FACTOR_ENFORCED. Laisser le frontend la redériver de son côté
   * garantissait qu'ils divergent — et c'est exactement ce qui s'était
   * produit.
   */
  @Get('me')
  me(@CurrentUser() user: any) {
    return {
      ...user,
      twoFactorSetupRequired: this.twoFactorPolicy.isSetupRequiredFor(user),
    };
  }

  /**
   * Réinitialise la double authentification d'un compte (CDC §2.4).
   *
   * Usage normal : un agent a perdu son téléphone et ne peut plus se
   * connecter. Usage de recette : se débloquer sans application
   * d'authentification sous la main.
   *
   * Le secret, les codes de secours et l'activation sont effacés — le compte
   * repart d'une configuration vierge. Réservé au Super Admin et journalisé :
   * retirer un facteur d'authentification à quelqu'un d'autre doit laisser une
   * trace nominative.
   */
  @Patch(':id/two-factor/reset')
  @Roles('SUPER_ADMIN')
  resetTwoFactor(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.usersService.resetTwoFactorAsAdmin(id, actor.id, actor?.role?.name);
  }

  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('department') department?: string,
  ) {
    return this.usersService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      role,
      department,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: any,
  ) {
    return this.usersService.update(id, dto, actor?.id, actor?.role?.name);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.usersService.remove(id, actor?.role?.name);
  }
}
