import { EntityId } from './value-objects';

export interface Repository<T> {
  findById(id: EntityId): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  update(entity: T): Promise<void>;
  delete(id: EntityId): Promise<void>;
}
