import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { CustomersService } from './customers.service';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FilterCustomerDto } from './dto/filter-customer.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get()
  findAll(@Query() filter: FilterCustomerDto, @CurrentUser() user: any) {
    // Un commercial ne voit que son portefeuille ; les autres profils, tout.
    const scope = user?.role?.name === 'COMMERCIAL' ? user.id : undefined;
    return this.customersService.findAll(filter, scope);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.customersService.findOne(id, user?.role?.name === 'COMMERCIAL' ? user.id : undefined);
    }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user?: any) {
    return this.customersService.update(id, dto, user?.role?.name === 'COMMERCIAL' ? user.id : undefined);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  remove(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.customersService.remove(id, user?.role?.name === 'COMMERCIAL' ? user.id : undefined);
  }
}
