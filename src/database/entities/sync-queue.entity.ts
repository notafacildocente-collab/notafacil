import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * SYNC_QUEUE: Cola de operaciones pendientes de sincronización
 * - Para operaciones creadas offline que fallaron al sincronizarse
 * - Se reintenta periódicamente
 */
@Entity('sync_queue')
@Index(['deviceId', 'procesada'])
export class SyncQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  deviceId: string;

  @Column('varchar', { length: 50 })
  operacion: string; // CREATE, UPDATE, DELETE

  @Column('varchar', { length: 100 })
  entidad: string; // 'NOTA', etc.

  @Column('jsonb')
  payload: any;

  @CreateDateColumn()
  createdAt: Date;

  @Column('boolean', { default: false })
  procesada: boolean;

  @Column('text', { nullable: true })
  error: string;
}
