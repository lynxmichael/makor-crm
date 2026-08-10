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

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { SenderIdService } from './sender-id.service';

import { CreateSenderIdRequestDto } from './dto/create-sender-id.dto';
import { UpdateSenderIdRequestDto } from './dto/update-sender-id.dto';
import { RejectSenderIdDto } from './dto/reject-sender-id.dto';

@ApiTags('Sender ID')
@ApiBearerAuth()
@Controller('sender-id')
@UseGuards(JwtAuthGuard)
export class SenderIdController {
  constructor(private readonly senderIdService: SenderIdService) {}

  @Post()
  @ApiOperation({ summary: 'Soumettre une demande de Sender ID' })
  create(
    @Body() dto: CreateSenderIdRequestDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.senderIdService.create(dto, user.id);
  }

  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('partnerCountry') partnerCountry?: string,
  ) {
    return this.senderIdService.findAll({
      page: Number(page),
      limit: Number(limit),
      status,
      customerId,
      partnerCountry,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.senderIdService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSenderIdRequestDto) {
    return this.senderIdService.update(id, dto);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES')
  @ApiOperation({ summary: 'Approuver la demande' })
  approve(@Param('id') id: string) {
    return this.senderIdService.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES')
  @ApiOperation({ summary: 'Rejeter la demande' })
  reject(@Param('id') id: string, @Body() dto: RejectSenderIdDto) {
    return this.senderIdService.reject(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.senderIdService.remove(id);
  }
}
