import { Injectable } from '@nestjs/common';
import { IAuthRepository } from '../../domain/authentication/auth.repository.interface';
import { User, UserRole } from '../../domain/authentication/user.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreAuthRepository extends FirestoreRepository<User> implements IAuthRepository {
  protected collectionName = 'users';

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.findByField('email', email);
    return users.length > 0 ? users[0] : null;
  }
}
