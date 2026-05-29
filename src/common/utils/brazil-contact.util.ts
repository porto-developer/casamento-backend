import { BadRequestException } from '@nestjs/common';
import { stripNonDigits } from './digits.util';

function isValidCpf(digits: string): boolean {
  // CPFs com todos os dígitos iguais são inválidos (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i);
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  if (firstDigit !== Number(digits[9])) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * (11 - i);
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  return secondDigit === Number(digits[10]);
}

/**
 * Telefone BR opcional: vazio/null → null; preenchido → só dígitos, 10–11 caracteres.
 */
export function parseOptionalBrazilPhone(
  phone?: string | null,
): string | null {
  if (phone == null || phone === '') {
    return null;
  }
  const digits = stripNonDigits(phone);
  if (digits.length < 10 || digits.length > 11) {
    throw new BadRequestException('Telefone inválido');
  }
  return digits;
}

/** Telefone BR obrigatório (ex.: checkout). */
export function parseRequiredBrazilPhone(phone: string): string {
  const digits = stripNonDigits(phone);
  if (digits.length < 10 || digits.length > 11) {
    throw new BadRequestException('Telefone inválido');
  }
  return digits;
}

/**
 * CPF (11 dígitos) opcional: vazio/null → null; preenchido → valida tamanho e dígitos verificadores.
 */
export function parseOptionalBrazilCpf(
  document?: string | null,
): string | null {
  if (document == null || document === '') {
    return null;
  }
  const digits = stripNonDigits(document);
  if (!/^\d{11}$/.test(digits) || !isValidCpf(digits)) {
    throw new BadRequestException('CPF inválido');
  }
  return digits;
}

/** CPF obrigatório (ex.: checkout). */
export function parseRequiredBrazilCpf(document: string): string {
  const digits = stripNonDigits(document);
  if (!/^\d{11}$/.test(digits) || !isValidCpf(digits)) {
    throw new BadRequestException('CPF inválido');
  }
  return digits;
}
