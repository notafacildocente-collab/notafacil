import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { Colegio } from './colegio.entity';
import { Curso } from './curso.entity';
import { Nota } from './nota.entity';
import { Recuperacion } from './recuperacion.entity';

@Entity('estudiantes')
@Index(['colegioId', 'numeroDocumento'])
export class Estudiante {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  colegioId: string;

  @Column('uuid')
  cursoId: string;

  @Column('varchar', { length: 50 })
  numeroDocumento: string;

  @Column('varchar', { length: 255 })
  nombre: string;

  @Column('varchar', { length: 255 })
  apellido: string;

  @Column('varchar', { length: 255, nullable: true })
  email: string;

  @Column('date', { nullable: true })
  fechaNacimiento: Date;

  @Column('boolean', { default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Colegio, (colegio) => colegio.estudiantes, { onDelete: 'CASCADE' })
  colegio: Colegio;

  @ManyToOne(() => Curso, (curso) => curso.estudiantes, { onDelete: 'CASCADE' })
  curso: Curso;

  @OneToMany(() => Nota, (nota) => nota.estudiante)
  notas: Nota[];

  @OneToMany(() => Recuperacion, (rec) => rec.estudiante)
  recuperaciones: Recuperacion[];
}
