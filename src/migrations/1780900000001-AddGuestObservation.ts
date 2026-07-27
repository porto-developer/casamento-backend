import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuestObservation1780900000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE guests ADD COLUMN IF NOT EXISTS observation TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE guests DROP COLUMN IF EXISTS observation
    `);
  }
}
