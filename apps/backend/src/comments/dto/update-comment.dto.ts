import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Seul le corps est modifiable : déplacer un commentaire d'une entité à une
 * autre après coup n'a pas de sens et casserait le fil de discussion.
 */
export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}
