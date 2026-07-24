import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IAuthService } from '../../domain/authentication/auth-service.interface';
import { User, UserRole, IUser } from '../../domain/authentication/user.entity';

@Injectable()
export class FirebaseAuthService implements IAuthService {
  async validateToken(token: string): Promise<User> {
    try {
      const firebase = await import('firebase-admin');
      const decoded = await firebase.default.auth().verifyIdToken(token);
      const userRecord = await firebase.default.auth().getUser(decoded.uid);
      return this.mapToUser(userRecord, decoded.uid);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async createUser(email: string, displayName: string, photoUrl?: string): Promise<User> {
    const firebase = await import('firebase-admin');
    const userRecord = await firebase.default.auth().createUser({
      email,
      displayName,
      photoURL: photoUrl,
    });
    return this.mapToUser(userRecord, userRecord.uid);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const firebase = await import('firebase-admin');
    const updateData: Record<string, unknown> = {};
    if (data.email) updateData.email = data.email;
    if (data.displayName) updateData.displayName = data.displayName;
    if (data.photoUrl) updateData.photoURL = data.photoUrl;
    const userRecord = await firebase.default.auth().updateUser(id, updateData);
    return this.mapToUser(userRecord, id);
  }

  async deleteUser(id: string): Promise<void> {
    const firebase = await import('firebase-admin');
    await firebase.default.auth().deleteUser(id);
  }

  async assignRole(userId: string, workspaceId: string, role: string): Promise<void> {
    const firebase = await import('firebase-admin');
    await firebase.default.firestore()
      .collection('users').doc(userId)
      .update({
        [`roles.${workspaceId}`]: firebase.default.firestore.FieldValue.arrayUnion(role),
      });
  }

  private mapToUser(record: { uid: string; email?: string; displayName?: string; photoURL?: string; }, uid: string): User {
    return new User(
      uid,
      record.email ?? '',
      record.displayName ?? '',
      record.photoURL,
      {},
      new Date(),
      new Date(),
      undefined,
      true,
    );
  }
}
