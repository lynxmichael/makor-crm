import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { MessagesService } from './messages.service';

import { CreateMessageDto } from './dto/create-message.dto';
import { FilterMessageDto } from './dto/filter-message.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Boîte de réception' })
  inbox(@CurrentUser() user: { id: string }, @Query() filter: FilterMessageDto) {
    return this.messagesService.inbox(user.id, filter);
  }

  @Get('sent')
  @ApiOperation({ summary: 'Messages envoyés' })
  sent(@CurrentUser() user: { id: string }, @Query() filter: FilterMessageDto) {
    return this.messagesService.sent(user.id, filter);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Conversations, triées par dernier message' })
  conversations(@CurrentUser() user: { id: string }) {
    return this.messagesService.conversations(user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Compteur pour la pastille de la barre supérieure' })
  unreadCount(@CurrentUser() user: { id: string }) {
    return this.messagesService.unreadCount(user.id);
  }

  // Placé après les routes littérales : sans cela, « sent » et
  // « conversations » seraient capturés comme des identifiants de collègue.
  @Get('thread/:partnerId')
  @ApiOperation({ summary: 'Fil complet avec un collègue (marque les messages comme lus)' })
  thread(@CurrentUser() user: { id: string }, @Param('partnerId') partnerId: string) {
    return this.messagesService.thread(user.id, partnerId);
  }

  @Post()
  @ApiOperation({ summary: 'Envoyer un message, avec pièce jointe optionnelle' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename(_req, file, cb) {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1000000);
          cb(null, unique + extname(file.originalname));
        },
      }),
      // Même plafond que la GED : 20 Mo.
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  send(
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: { id: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.messagesService.send(
      dto,
      user.id,
      file
        ? { path: file.filename, name: file.originalname, size: file.size }
        : undefined,
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer un message comme lu' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.messagesService.markAsRead(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Retirer un message de sa propre boîte' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.messagesService.remove(id, user.id);
  }
}
