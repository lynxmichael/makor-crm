import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RolePermissionsService } from './role-permissions.service';

import { CreateRolePermissionDto } from './dto/create-role-permission.dto';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import { Roles } from '../auth/decorators/roles.decorator';

// Rattachement des permissions aux rôles — Super Admin uniquement
// (CDC §7). C'est la table qui décide qui peut quoi : l'ouvrir revenait à
// ouvrir tout le reste.
@ApiTags('Rôles et permissions')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
@Controller('role-permissions')
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @Post()
  create(@Body() dto: CreateRolePermissionDto) {
    return this.rolePermissionsService.create(dto);
  }

  @Get()
  findAll() {
    return this.rolePermissionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolePermissionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRolePermissionDto) {
    return this.rolePermissionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolePermissionsService.remove(id);
  }
}
