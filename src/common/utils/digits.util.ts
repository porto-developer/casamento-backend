/** Remove tudo que não for dígito (útil para telefone, CPF, etc.). */
export function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '');
}
