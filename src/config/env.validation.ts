import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
  validateSync,
} from 'class-validator';

export enum PaymentProvider {
  MOCK = 'mock',
  ASAAS = 'asaas',
}

export class EnvironmentVariables {
  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  DATABASE_PORT: number;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string;

  @IsNumber()
  PORT: number;

  @IsEnum(PaymentProvider)
  PAYMENT_PROVIDER: PaymentProvider;

  // Asaas gateway — obrigatórias apenas quando PAYMENT_PROVIDER=asaas
  @ValidateIf((o) => o.PAYMENT_PROVIDER === PaymentProvider.ASAAS)
  @IsUrl({ require_tld: true })
  ASAAS_API_URL: string;

  @ValidateIf((o) => o.PAYMENT_PROVIDER === PaymentProvider.ASAAS)
  @IsString()
  ASAAS_API_KEY: string;

  @ValidateIf((o) => o.PAYMENT_PROVIDER === PaymentProvider.ASAAS)
  @IsString()
  ASAAS_AUTH_TOKEN: string;

  // Origens permitidas no CORS (separadas por vírgula).
  // Quando ausente, bloqueia todas as origens externas.
  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
