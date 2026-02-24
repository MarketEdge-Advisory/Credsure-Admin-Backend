import { Role } from '../common/enums/role.enum';

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}
