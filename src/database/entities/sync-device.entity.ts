import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { Usuario } from './usuario.entity';

/**
 * SYNC_DEVICES: Tracking de dispositivos móviles para offline-first
 * - Cada profesor tiene N dispositivos
 * - Registra sincronización y versión de app
 */
@Entity('sync_devices')
@Index(['usuarioId', 'deviceId'])
export class SyncDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  usuarioId: string;

  @Column('varchar', { length: 255 })
  deviceId: string;

  @Column('varchar', { length: 255, nullable: true })
  deviceName: string;

  @Column('varchar', { length: 20, nullable: true })
  appVersion: string;

  @Column('timestamp', { nullable: true })
  lastSync: Date;

  @Column('text', { nullable: true })
  syncToken: string; // Para sincronización incremental

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Usuario, (usuario) => usuario.sedes, { onDelete: 'CASCADE' })
  usuario: Usuario;
}
