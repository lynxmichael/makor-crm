export interface JwtPayload {
  sub: string;
  email: string;
  roleId: string;
  companyId?: string;
  tokenVersion: number;
}
