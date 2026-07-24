import { Injectable } from '@nestjs/common';
import { IAuthService } from '../../domain/authentication/auth-service.interface';
import { User, UserRole } from '../../domain/authentication/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InMemoryAuthService implements IAuthService {
  private users = new Map<string, User>();

  async validateToken(token: string): Promise<User> {
    const userId = this.decodeToken(token);
    let user = this.users.get(userId);
    if (!user) {
      user = new User(userId, 'user@example.com', 'User', undefined, {}, new Date(), new Date(), undefined, true);
      this.users.set(userId, user);
    }
    return user;
  }

  async createUser(email: string, displayName: string, photoUrl?: string): Promise<User> {
    const user = new User(uuidv4(), email, displayName, photoUrl, {}, new Date(), new Date(), undefined, true);
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error('User not found');
    return existing;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  async assignRole(userId: string, workspaceId: string, role: string): Promise<void> {
    // no-op for dev
  }

  private decodeToken(token: string): string {
    try {
      const parts = token.split('.');
      if (parts.length === 2) return token;
      return token;
    } catch {
      return token;
    }
  }
}
