import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { Colegio } from './colegio.entity';
import { ProfesorAsignacion } from './profesor-asignacion.entity';

@Entity('materias')
@Index(['colegioId', 'codigo'])
export class Materia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  colegioId: string;

  @Column('varchar', { length: 255 })
  nombre: string;

  @Column('varchar', { length: 50, nullable: true })
  codigo: string;

  @Column('int', { nullable: true })
  intensidadHoraria: number; // Horas por semana

  @Column('boolean', { default: true })
  activa: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Colegio, (colegio) => colegio.materias, { onDelete: 'CASCADE' })
  colegio: Colegio;

  @OneToMany(() => ProfesorAsignacion, (asignacion) => asignacion.materia)
  asignaciones: ProfesorAsignacion[];
}
