import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { Colegio } from './colegio.entity';
import { CoordinadorSede } from './coordinador-sede.entity';
import { Curso } from './curso.entity';

@Entity('sedes')
@Index(['colegioId', 'nombre'])
export class Sede {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  colegioId: string;

  @Column('varchar', { length: 255 })
  nombre: string;

  @Column('varchar', { length: 100, nullable: true })
  ciudad: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Colegio, (colegio) => colegio.sedes, { onDelete: 'CASCADE' })
  colegio: Colegio;

  @OneToMany(() => CoordinadorSede, (cs) => cs.sede)
  coordinadores: CoordinadorSede[];

  @OneToMany(() => Curso, (curso) => curso.sede)
  cursos: Curso[];
}
