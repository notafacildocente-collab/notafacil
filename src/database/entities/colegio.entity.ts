import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Periodo } from './periodo.entity';
import { Materia } from './materia.entity';
import { Sede } from './sede.entity';
import { Estudiante } from './estudiante.entity';
import { Desempeno } from './desempeno.entity';

@Entity('colegios')
@Index(['nit'])
export class Colegio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  nombre: string;

  @Column('varchar', { length: 20, unique: true })
  nit: string;

  @Column('varchar', { length: 100 })
  ciudad: string;

  @Column('varchar', { length: 50, default: 'SIEE' })
  regimenEvaluacion: string;

  @Column('numeric', { precision: 3, scale: 1, default: 1.0 })
  escalaMínima: number;

  @Column('numeric', { precision: 3, scale: 1, default: 5.0 })
  escalaMaxima: number;

  @Column('int', { default: 1 })
  redondeoDecimales: number;

  @Column('text', { nullable: true })
  logoUrl: string;

  @Column('text', { nullable: true })
  politicaDatos: string; // PDF Habeas Data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Usuario, (usuario) => usuario.colegio)
  usuarios: Usuario[];

  @OneToMany(() => Periodo, (periodo) => periodo.colegio)
  periodos: Periodo[];

  @OneToMany(() => Materia, (materia) => materia.colegio)
  materias: Materia[];

  @OneToMany(() => Sede, (sede) => sede.colegio)
  sedes: Sede[];

  @OneToMany(() => Estudiante, (estudiante) => estudiante.colegio)
  estudiantes: Estudiante[];

  @OneToMany(() => Desempeno, (desempeno) => desempeno.colegio)
  desempenos: Desempeno[];
}
