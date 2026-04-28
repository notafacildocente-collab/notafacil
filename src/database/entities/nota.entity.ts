import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { ProfesorAsignacion } from './profesor-asignacion.entity';
import { Desempeno } from './desempeno.entity';
import { Estudiante } from './estudiante.entity';
import { Usuario } from './usuario.entity';

/**
 * NOTA: Entidad crítica con trazabilidad para Ley 1581
 * - Cada nota registra quién la creó, cuándo, desde qué dispositivo
 * - Importante: El profesor puede ingresar múltiples notas por desempeño
 * - Promedio de desempeño = suma de notas / cantidad de notas
 */
@Entity('notas')
@Index(['estudianteId', 'desempenoId'])
@Index(['asignacionId', 'createdAt'])
export class Nota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  asignacionId: string;

  @Column('uuid')
  desempenoId: string;

  @Column('uuid')
  estudianteId: string;

  @Column('numeric', { precision: 5, scale: 2 })
  valor: number; // 1.0 a 5.0

  @Column('text', { nullable: true })
  descripcion: string; // "Quiz 1", "Taller grupal", etc.

  // ==== TRAZABILIDAD LEY 1581 ====
  @Column('uuid')
  profesorId: string;

  @Column('varchar', { length: 255, nullable: true })
  deviceId: string; // UUID del dispositivo móvil

  @Column('boolean', { default: false })
  creadoOffline: boolean; // True si se creó sin internet

  @Column('inet', { nullable: true })
  ipAddress: string; // IP desde la que se creó

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ==== SINCRONIZACIÓN MÓVIL ====
  @Column('int', { default: 0 })
  syncVersion: number; // Para detectar conflictos de sincronización

  // Relations
  @ManyToOne(() => ProfesorAsignacion, (asignacion) => asignacion.notas, { onDelete: 'CASCADE' })
  asignacion: ProfesorAsignacion;

  @ManyToOne(() => Desempeno, (desempeno) => desempeno.notas, { onDelete: 'CASCADE' })
  desempeno: Desempeno;

  @ManyToOne(() => Estudiante, (estudiante) => estudiante.notas, { onDelete: 'CASCADE' })
  estudiante: Estudiante;

  @ManyToOne(() => Usuario)
  profesor: Usuario;
}
