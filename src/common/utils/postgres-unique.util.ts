import { ConflictException } from '@nestjs/common';

/** Código PostgreSQL unique_violation */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * Se o erro for violação de UNIQUE no Postgres, lança ConflictException.
 * Caso contrário não faz nada (deixe o caller relançar o erro original).
 */
export function throwIfPostgresUniqueViolation(
  err: unknown,
  message: string,
): void {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? (err as { code?: string }).code
      : undefined;
  if (code === PG_UNIQUE_VIOLATION) {
    throw new ConflictException(message);
  }
}
