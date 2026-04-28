import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, Index, Unique,
} from 'typeorm';
import { ProfesorAsignacion } from './profesor-asignacion.entity';
import { Estudiante } from './estudiante.entity';
import { Usuario } from './usuario.entity';

export type EstadoAsistencia = 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADA' | 'INJUSTIFICADA';

@Entity('asistencia')
@Unique(['asignacionId', 'estudianteId', 'fecha']) // Un registro por estudiante por clase por día
@Index(['asignacionId', 'fecha'])
@Index(['estudianteId', 'fecha'])
export class Asistencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  asignacionId: string;

  @Column('uuid')
  estudianteId: string;

  @Column('uuid')
  profesorId: string;

  @Column({ type: 'date' })
  fecha: string; // 'YYYY-MM-DD'

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PRESENTE',
  })
  estado: EstadoAsistencia;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacion: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ProfesorAsignacion, { onDelete: 'CASCADE' })
  asignacion: ProfesorAsignacion;

  @ManyToOne(() => Estudiante, { onDelete: 'CASCADE' })
  estudiante: Estudiante;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  profesor: Usuario;
}
