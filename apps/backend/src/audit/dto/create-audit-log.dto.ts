import { AuditAction } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAuditLogDto {
  @IsEnum(AuditAction)
  action!: AuditAction;

  @IsString()
  entity!: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
