import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { Periodo } from './periodo.entity';
import { Usuario } from './usuario.entity';

/**
 * CIERRE DE PERÍODO: Auditoría de cuándo se bloquea la edición de calificaciones
 * - Registra quién cerró y cuándo
 * - Después del cierre, solo RECTOR puede reabrir
 */
@Entity('cierres_periodo')
@Index(['periodoId'])
export class CierrePeriodo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  periodoId: string;

  @Column('uuid')
  coordinadorId: string;

  @Column('uuid')
  cerradoPorId: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  fechaCierre: Date;

  @Column('text', { nullable: true })
  razon: string;

  @Column('inet', { nullable: true })
  ipAddress: string;

  // Relations
  @ManyToOne(() => Periodo, (periodo) => periodo.cierres, { onDelete: 'CASCADE' })
  periodo: Periodo;

  @ManyToOne(() => Usuario)
  coordinador: Usuario;

  @ManyToOne(() => Usuario)
  cerradoPor: Usuario;
}
