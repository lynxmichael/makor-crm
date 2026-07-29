import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignPurchaseOrderDto {
  @ApiProperty({
    required: false,
    description:
      'Chemin du scan signé par le client (V1 : signature papier numérisée — la signature électronique complète est en V2, cf. CDC §5)',
  })
  @IsOptional()
  @IsString()
  signedDocumentPath?: string;
}
