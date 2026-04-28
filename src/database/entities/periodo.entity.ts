import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { Colegio } from './colegio.entity';
import { Desempeno } from './desempeno.entity';
import { ProfesorAsignacion } from './profesor-asignacion.entity';
import { Recuperacion } from './recuperacion.entity';
import { CierrePeriodo } from './cierre-periodo.entity';

@Entity('periodos')
@Index(['colegioId', 'numero', 'año'])
export class Periodo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  colegioId: string;

  @Column('int')
  numero: number; // 1, 2, 3, 4

  @Column('int')
  año: number;

  @Column('date')
  fechaInicio: Date;

  @Column('date')
  fechaFin: Date;

  @Column('date')
  fechaCierre: Date; // Después de esta fecha, no se editan calificaciones

  @Column('boolean', { default: false })
  cerrado: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Colegio, (colegio) => colegio.periodos, { onDelete: 'CASCADE' })
  colegio: Colegio;

  @OneToMany(() => Desempeno, (desempeno) => desempeno.periodo)
  desempenos: Desempeno[];

  @OneToMany(() => ProfesorAsignacion, (asignacion) => asignacion.periodo)
  asignaciones: ProfesorAsignacion[];

  @OneToMany(() => CierrePeriodo, (cierre) => cierre.periodo)
  cierres: CierrePeriodo[];
}
