import { SetMetadata } from '@nestjs/common';
import { Role } from '../../enumeration/role.enum';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
