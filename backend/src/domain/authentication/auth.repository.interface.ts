import { User } from './user.entity';

export const AUTH_REPOSITORY = 'AUTH_REPOSITORY';

export interface IAuthRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}
