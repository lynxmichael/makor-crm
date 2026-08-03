import { IsIn, IsString, MinLength } from 'class-validator';

export class SubmitSignatureDto {
  /** Tracé en data-URL, ou nom saisi selon le mode retenu. */
  @IsString()
  @MinLength(2)
  signatureData!: string;

  @IsIn(['drawn', 'typed'])
  signatureType!: string;
}

export class RefuseSignatureDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
