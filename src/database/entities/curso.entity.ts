import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { Sede } from './sede.entity';
import { Colegio } from './colegio.entity';
import { Estudiante } from './estudiante.entity';
import { ProfesorAsignacion } from './profesor-asignacion.entity';

@Entity('cursos')
@Index(['sedeId', 'nombre'])
export class Curso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  colegioId: string;

  @Column('uuid')
  sedeId: string;

  @Column('varchar', { length: 100 })
  nombre: string; // 1-A, 5-B, 11-C

  @Column('int')
  grado: number; // 1 a 11

  @Column('varchar', { length: 50, nullable: true })
  jornada: string; // MAÑANA, TARDE, NOCHE

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Colegio)
  colegio: Colegio;

  @ManyToOne(() => Sede, (sede) => sede.cursos, { onDelete: 'CASCADE' })
  sede: Sede;

  @OneToMany(() => Estudiante, (estudiante) => estudiante.curso)
  estudiantes: Estudiante[];

  @OneToMany(() => ProfesorAsignacion, (asignacion) => asignacion.curso)
  asignaciones: ProfesorAsignacion[];
}
