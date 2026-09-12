import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderInstallmentId1780900000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS provider_installment_id VARCHAR(255)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id
      ON payments(provider_payment_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_provider_installment_id
      ON payments(provider_installment_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payments_provider_installment_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payments_provider_payment_id`,
    );
    await queryRunner.query(`
      ALTER TABLE payments DROP COLUMN IF EXISTS provider_installment_id
    `);
  }
}
