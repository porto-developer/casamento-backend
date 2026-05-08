import { randomUUID } from 'crypto';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';

@Entity('guests')
export class Guest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 14, nullable: true, unique: true })
  document: string | null;

  @Column({ type: 'int', nullable: true })
  parent_guest_id: number | null;

  @ManyToOne(() => Guest, (g) => g.children, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_guest_id' })
  parent: Guest | null;

  @OneToMany(() => Guest, (g) => g.parent)
  children: Guest[];

  @Column({ type: 'boolean', nullable: true })
  will_attend: boolean | null;

  @Column({ type: 'timestamp', nullable: true })
  rsvp_updated_at: Date | null;

  @Column({ type: 'uuid', nullable: true, unique: true })
  invite_token: string | null;

  @CreateDateColumn()
  created_at: Date;

  @BeforeInsert()
  ensureInviteTokenForPrimary(): void {
    if (this.parent_guest_id == null && !this.invite_token) {
      this.invite_token = randomUUID();
    }
  }
}
