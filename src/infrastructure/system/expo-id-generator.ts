import { randomUUID } from 'expo-crypto';

import type { IdGenerator } from '@/application/ports/id-generator';

export class ExpoIdGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}
