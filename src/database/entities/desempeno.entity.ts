import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { Colegio } from './colegio.entity';
import { Periodo } from './periodo.entity';
import { Nota } from './nota.entity';
import { Materia } from './materia.entity';

@Entity('desempenos')
@Index(['periodoId', 'colegioId'])
export class Desempeno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  colegioId: string;

  @Column('uuid')
  periodoId: string;

  @Column('uuid', { nullable: true })
  materiaId: string;

  @Column('varchar', { length: 255 })
  nombre: string; // Cognitivo, Procedimental, Actitudinal

  @Column('numeric', { precision: 5, scale: 2 })
  porcentaje: number; // 30.00, 30.00, 40.00

  @Column('int', { nullable: true })
  orden: number;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Colegio)
  colegio: Colegio;

  @ManyToOne(() => Materia, { nullable: true })
  materia: Materia;

  @ManyToOne(() => Periodo, (periodo) => periodo.desempenos, { onDelete: 'CASCADE' })
  periodo: Periodo;

  @OneToMany(() => Nota, (nota) => nota.desempeno)
  notas: Nota[];
}
