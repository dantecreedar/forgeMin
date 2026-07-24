import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { IAuthService, AUTH_SERVICE } from '../../domain/authentication/auth-service.interface';
import { IAuthRepository, AUTH_REPOSITORY } from '../../domain/authentication/auth.repository.interface';
import { User, UserRole } from '../../domain/authentication/user.entity';

@Injectable()
export class AuthApplicationService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: IAuthRepository,
    @Inject(AUTH_SERVICE)
    private readonly firebaseAuthService: IAuthService,
  ) {}

  async validateToken(token: string): Promise<User> {
    const firebaseUser = await this.firebaseAuthService.validateToken(token);
    const existing = await this.authRepository.findById(firebaseUser.id);
    if (existing) {
      const updated = new User(
        existing.id,
        existing.email,
        existing.displayName,
        existing.photoUrl,
        existing.roles,
        existing.createdAt,
        new Date(),
        new Date(),
        existing.isActive,
      );
      await this.authRepository.update(updated);
      return updated;
    }
    const newUser = new User(
      firebaseUser.id,
      firebaseUser.email,
      firebaseUser.displayName,
      firebaseUser.photoUrl,
      {},
      new Date(),
      new Date(),
      new Date(),
      true,
    );
    await this.authRepository.save(newUser);
    return newUser;
  }

  async getCurrentUser(userId: string): Promise<User | null> {
    return this.authRepository.findById(userId);
  }

  async createUser(email: string, displayName: string, photoUrl?: string): Promise<User> {
    return this.firebaseAuthService.createUser(email, displayName, photoUrl);
  }

  async assignRole(userId: string, workspaceId: string, role: UserRole): Promise<void> {
    await this.firebaseAuthService.assignRole(userId, workspaceId, role);
  }
}
