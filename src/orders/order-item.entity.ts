import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  order_id: number;

  @Column({ type: 'int', nullable: true })
  gift_id: number | null;

  @Column({ type: 'varchar', length: 255 })
  gift_name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  gift_price: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
