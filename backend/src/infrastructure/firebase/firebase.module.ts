import { Module, Global, OnModuleInit } from '@nestjs/common';
import * as firebase from 'firebase-admin';
import * as path from 'path';

@Global()
@Module({})
export class FirebaseModule implements OnModuleInit {
  onModuleInit() {
    if (!firebase.apps.length) {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      const serviceAccount = serviceAccountPath
        ? require(path.resolve(process.cwd(), serviceAccountPath))
        : undefined;

      firebase.initializeApp(
        serviceAccount
          ? { credential: firebase.credential.cert(serviceAccount) }
          : { projectId: process.env.FIREBASE_PROJECT_ID },
      );

      firebase.firestore().settings({ ignoreUndefinedProperties: true });
    }
  }
}
