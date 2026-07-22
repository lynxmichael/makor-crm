import { IsString } from 'class-validator';

export class CreateRolePermissionDto {
  @IsString()
  roleId!: string;

  @IsString()
  permissionId!: string;
}
