import { IsString, Matches } from 'class-validator';

export class ComputeCommissionsDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'La période attendue est au format AAAA-MM.' })
  period!: string;
}
