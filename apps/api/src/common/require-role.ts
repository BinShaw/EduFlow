import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from './auth.types';
import { UserRole } from '@prisma/client';

export function requireRole(user: AuthUser, role: UserRole): void {
  if (user.role !== role)
    throw new ForbiddenException('You do not have permission to perform this action.');
}
