import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropGuestPhoneUnique1780900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_phone_key
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE guests ADD CONSTRAINT guests_phone_key UNIQUE (phone)
    `);
  }
}
