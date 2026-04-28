import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { Desempeno } from './desempeno.entity';
import { Estudiante } from './estudiante.entity';
import { Usuario } from './usuario.entity';

/**
 * RECUPERACIÓN: Nota especial que reemplaza el promedio de un desempeño
 * - Campo justificación obligatorio (auditoría)
 * - Una recuperación por desempeño por estudiante
 */
@Entity('recuperaciones')
@Index(['estudianteId'])
@Index(['desempenoId', 'estudianteId'], { unique: true })
export class Recuperacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  desempenoId: string;

  @Column('uuid')
  estudianteId: string;

  @Column('uuid')
  profesorId: string;

  @Column('numeric', { precision: 5, scale: 2 })
  valor: number; // 1.0 a 5.0

  @Column('text')
  justificacion: string; // Obligatorio: por qué la recuperación

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Desempeno, { onDelete: 'CASCADE' })
  desempeno: Desempeno;

  @ManyToOne(() => Estudiante, (estudiante) => estudiante.recuperaciones, { onDelete: 'CASCADE' })
  estudiante: Estudiante;

  @ManyToOne(() => Usuario)
  profesor: Usuario;
}
