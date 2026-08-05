import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentInstallments1780900000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS installments INTEGER NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments DROP COLUMN IF EXISTS installments
    `);
  }
}
