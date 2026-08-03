import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { RolePermissionsService } from './role-permissions.service';

import { CreateRolePermissionDto } from './dto/create-role-permission.dto';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';

@Controller('role-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
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
