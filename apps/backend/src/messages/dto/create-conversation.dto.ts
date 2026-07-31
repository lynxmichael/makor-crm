import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({
    each: true,
  })
  participantIds!: string[];
}
