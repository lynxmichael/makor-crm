import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsEnum(DocumentType)
  type!: DocumentType;

 @IsString()
  uploadedById!: string;
}
