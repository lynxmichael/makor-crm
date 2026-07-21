import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  firstName!: string;

  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  phone?: string;

  @IsString()
  password!: string;

  @IsOptional()
  avatar?: string;

  @IsOptional()
  jobTitle?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  roleId!: string;

  @IsOptional()
  departmentId?: string;
}