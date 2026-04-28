import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Materia } from './materia.entity';
import { Curso } from './curso.entity';
import { Periodo } from './periodo.entity';
import { Nota } from './nota.entity';

@Entity('profesor_asignaciones')
@Index(['profesorId', 'activa'])
@Index(['profesorId', 'materiaId', 'cursoId', 'periodoId'])
export class ProfesorAsignacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  profesorId: string;

  @Column('uuid')
  materiaId: string;

  @Column('uuid')
  cursoId: string;

  @Column('uuid')
  periodoId: string;

  @Column('boolean', { default: true })
  activa: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Usuario, (usuario) => usuario.asignaciones, { onDelete: 'CASCADE' })
  profesor: Usuario;

  @ManyToOne(() => Materia, (materia) => materia.asignaciones, { onDelete: 'CASCADE' })
  materia: Materia;

  @ManyToOne(() => Curso, (curso) => curso.asignaciones, { onDelete: 'CASCADE' })
  curso: Curso;

  @ManyToOne(() => Periodo, (periodo) => periodo.asignaciones, { onDelete: 'CASCADE' })
  periodo: Periodo;

  @OneToMany(() => Nota, (nota) => nota.asignacion)
  notas: Nota[];
}
