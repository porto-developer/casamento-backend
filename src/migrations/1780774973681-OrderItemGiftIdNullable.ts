import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderItemGiftIdNullable1780774973681 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove a FK existente
    await queryRunner.query(`
      ALTER TABLE order_items
        DROP CONSTRAINT IF EXISTS order_items_gift_id_fkey
    `);

    // Torna a coluna nullable
    await queryRunner.query(`
      ALTER TABLE order_items
        ALTER COLUMN gift_id DROP NOT NULL
    `);

    // Recria a FK com ON DELETE SET NULL
    await queryRunner.query(`
      ALTER TABLE order_items
        ADD CONSTRAINT order_items_gift_id_fkey
        FOREIGN KEY (gift_id) REFERENCES gifts(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE order_items
        DROP CONSTRAINT IF EXISTS order_items_gift_id_fkey
    `);

    await queryRunner.query(`
      ALTER TABLE order_items
        ALTER COLUMN gift_id SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE order_items
        ADD CONSTRAINT order_items_gift_id_fkey
        FOREIGN KEY (gift_id) REFERENCES gifts(id)
    `);
  }
}
