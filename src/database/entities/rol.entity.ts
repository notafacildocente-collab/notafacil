import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('roles')
@Index(['nombre'])
export class Rol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50, unique: true })
  nombre: string; // RECTOR, COORDINADOR, PROFESOR, SECRETARIA

  @Column('text', { nullable: true })
  descripcion: string;

  @CreateDateColumn()
  createdAt: Date;

  static readonly ROLES = {
    RECTOR: 'RECTOR',
    COORDINADOR: 'COORDINADOR',
    PROFESOR: 'PROFESOR',
    SECRETARIA: 'SECRETARIA',
  };
}
