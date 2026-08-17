import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  dealId?: string;

  @IsOptional()
  @IsString()
  quoteId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsEnum(DocumentType)
  type!: DocumentType;

  /**
   * Déposant — renseigné par le serveur depuis le jeton, jamais par le client.
   *
   * Laissé au client, ce champ permettait d'attribuer un dépôt à un collègue :
   * la colonne « Déposé par » et le journal devenaient déclaratifs.
   */
  @IsOptional()
  @IsString()
  uploadedById?: string;
}
