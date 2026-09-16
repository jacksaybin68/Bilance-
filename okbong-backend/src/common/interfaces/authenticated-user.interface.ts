import { Role } from '../../enumeration/role.enum';

/** Shape of `request.user` after JwtStrategy#validate. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  /** Login yêu cầu bước 2FA (đã kích hoạt hoặc pending setup) */
  requires2FA?: boolean;
  /** Có secret nhưng chưa kích hoạt — pending setup */
  pendingSetup?: boolean;
}
