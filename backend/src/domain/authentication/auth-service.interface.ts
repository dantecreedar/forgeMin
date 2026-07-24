import { User } from './user.entity';

export const AUTH_SERVICE = 'AUTH_SERVICE';

export interface IAuthService {
  validateToken(token: string): Promise<User>;
  createUser(email: string, displayName: string, photoUrl?: string): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  assignRole(userId: string, workspaceId: string, role: string): Promise<void>;
}
