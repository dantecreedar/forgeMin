import { getFirestore, CollectionReference } from 'firebase-admin/firestore';

export abstract class FirestoreRepository<T extends { id: string }> {
  protected abstract collectionName: string;

  protected get collection(): CollectionReference {
    return getFirestore().collection(this.collectionName);
  }

  protected toEntity(docData: any): T {
    return docData as T;
  }

  async findById(id: string): Promise<T | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.toEntity({ id: doc.id, ...doc.data() });
  }

  async findAll(): Promise<T[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => this.toEntity({ id: doc.id, ...doc.data() }));
  }

  async findByField(field: string, value: unknown): Promise<T[]> {
    const snapshot = await this.collection.where(field, '==', value).get();
    return snapshot.docs.map((doc) => this.toEntity({ id: doc.id, ...doc.data() }));
  }

  async save(entity: T): Promise<void> {
    await this.collection.doc(entity.id).set({ ...entity });
  }

  async update(entity: T): Promise<void> {
    await this.collection.doc(entity.id).update({ ...entity });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
