 import { Transform } from 'class-transformer';

import { IsInt, IsOptional, Min } from 'class-validator';

export class QueryMessageDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit = 50;
}
