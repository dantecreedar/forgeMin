export class EntityId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('EntityId cannot be empty');
    }
  }

  equals(other: EntityId): boolean {
    return this.value === other.value;
  }
}

export class Email {
  constructor(public readonly value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error(`Invalid email: ${value}`);
    }
  }
}

export class Url {
  constructor(public readonly value: string) {
    try {
      new URL(value);
    } catch {
      throw new Error(`Invalid URL: ${value}`);
    }
  }
}

export class Timestamp {
  constructor(public readonly value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('Invalid date');
    }
  }

  static now(): Timestamp {
    return new Timestamp(new Date());
  }

  static fromISOString(iso: string): Timestamp {
    return new Timestamp(new Date(iso));
  }
}
