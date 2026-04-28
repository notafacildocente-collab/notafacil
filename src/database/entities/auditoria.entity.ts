import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { Colegio } from './colegio.entity';
import { Usuario } from './usuario.entity';

/**
 * AUDITORÍA: Trazabilidad obligatoria Ley 1581
 * - Registra cada operación en entidades críticas
 * - Valores anterior y nuevo en JSONB
 * - IP, dispositivo, user agent
 * - NUNCA se puede borrar
 */
@Entity('auditoria')
@Index(['usuarioId', 'createdAt'])
@Index(['entidad', 'createdAt'])
@Index(['colegioId', 'createdAt'])
export class Auditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  colegioId: string;

  @Column('uuid', { nullable: true })
  usuarioId: string;

  @Column('varchar', { length: 100 })
  entidad: string; // 'NOTA', 'USUARIO', 'DESEMPEN̄O', etc.

  @Column('uuid')
  entidadId: string;

  @Column('varchar', { length: 50 })
  operacion: string; // CREATE, UPDATE, DELETE

  @Column('jsonb', { nullable: true })
  valorAnterior: any;

  @Column('jsonb', { nullable: true })
  valorNuevo: any;

  @Column('inet', { nullable: true })
  ipAddress: string;

  @Column('varchar', { length: 255, nullable: true })
  deviceId: string;

  @Column('text', { nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Colegio)
  colegio: Colegio;

  @ManyToOne(() => Usuario, (usuario) => usuario.auditorias, { nullable: true })
  usuario: Usuario;
}
