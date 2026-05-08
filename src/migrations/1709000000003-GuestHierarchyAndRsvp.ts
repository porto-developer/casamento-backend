import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuestHierarchyAndRsvp1709000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE guests ALTER COLUMN phone DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE guests ALTER COLUMN document DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE guests ADD COLUMN parent_guest_id INTEGER
        REFERENCES guests(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE guests ADD COLUMN will_attend BOOLEAN
    `);
    await queryRunner.query(`
      ALTER TABLE guests ADD COLUMN rsvp_updated_at TIMESTAMP
    `);
    await queryRunner.query(`
      ALTER TABLE guests ADD COLUMN invite_token UUID UNIQUE
    `);

    await queryRunner.query(`
      UPDATE guests
      SET invite_token = gen_random_uuid()
      WHERE parent_guest_id IS NULL AND invite_token IS NULL
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_guests_parent ON guests(parent_guest_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_guests_parent`);

    await queryRunner.query(
      `ALTER TABLE guests DROP CONSTRAINT IF EXISTS "guests_parent_guest_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE guests DROP COLUMN IF EXISTS parent_guest_id`,
    );
    await queryRunner.query(
      `ALTER TABLE guests DROP COLUMN IF EXISTS will_attend`,
    );
    await queryRunner.query(
      `ALTER TABLE guests DROP COLUMN IF EXISTS rsvp_updated_at`,
    );
    await queryRunner.query(
      `ALTER TABLE guests DROP COLUMN IF EXISTS invite_token`,
    );

    await queryRunner.query(`
      DELETE FROM guests WHERE phone IS NULL OR document IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE guests ALTER COLUMN phone SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE guests ALTER COLUMN document SET NOT NULL
    `);
  }
}
