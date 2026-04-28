import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Sede } from './sede.entity';

@Entity('coordinador_sedes')
@Index(['coordinadorId', 'sedeId'])
export class CoordinadorSede {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  coordinadorId: string;

  @Column('uuid')
  sedeId: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Usuario, (usuario) => usuario.sedes, { onDelete: 'CASCADE' })
  coordinador: Usuario;

  @ManyToOne(() => Sede, (sede) => sede.coordinadores, { onDelete: 'CASCADE' })
  sede: Sede;
}
