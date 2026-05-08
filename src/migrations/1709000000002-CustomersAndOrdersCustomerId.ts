import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Non-production: truncates orders graph before reshaping FKs.
 * If you have local data to keep, dump it before running this migration.
 */
export class CustomersAndOrdersCustomerId1709000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        document VARCHAR(14) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `TRUNCATE TABLE orders RESTART IDENTITY CASCADE`,
    );

    await queryRunner.query(
      `ALTER TABLE orders DROP CONSTRAINT IF EXISTS "orders_guest_id_fkey"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_guest`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS guest_id`);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN customer_id INTEGER NOT NULL
      REFERENCES customers(id) ON DELETE RESTRICT
    `);

    await queryRunner.query(
      `CREATE INDEX idx_orders_customer ON orders(customer_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `TRUNCATE TABLE orders RESTART IDENTITY CASCADE`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_customer`);
    await queryRunner.query(
      `ALTER TABLE orders DROP CONSTRAINT IF EXISTS "orders_customer_id_fkey"`,
    );
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS customer_id`);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN guest_id INTEGER REFERENCES guests(id) ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX idx_orders_guest ON orders(guest_id)`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS customers`);
  }
}
