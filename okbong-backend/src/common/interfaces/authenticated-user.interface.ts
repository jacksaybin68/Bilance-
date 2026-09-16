import { Role } from '../../enumeration/role.enum';

/** Shape of `request.user` after JwtStrategy#validate. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
