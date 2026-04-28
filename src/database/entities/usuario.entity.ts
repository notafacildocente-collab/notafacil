import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, DeleteDateColumn, Index } from 'typeorm';
import { Colegio } from './colegio.entity';
import { Rol } from './rol.entity';
import { Nota } from './nota.entity';
import { Recuperacion } from './recuperacion.entity';
import { ProfesorAsignacion } from './profesor-asignacion.entity';
import { CoordinadorSede } from './coordinador-sede.entity';
import { Auditoria } from './auditoria.entity';

@Entity('usuarios')
@Index(['colegioId', 'rolId'])
@Index(['colegioId', 'email'])
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  colegioId: string;

  @Column('uuid')
  rolId: string;

  @Column('varchar', { length: 255 })
  email: string;

  @Column('varchar', { length: 20, nullable: true })
  telefono: string;

  @Column('varchar', { length: 255 })
  nombre: string;

  @Column('varchar', { length: 50, nullable: true })
  documento: string;

  @Column('varchar', { length: 255 })
  passwordHash: string;

  @Column('boolean', { default: true })
  activo: boolean;

  @Column('boolean', { default: false })
  politicaAceptada: boolean;

  @Column('timestamp', { nullable: true })
  politicaAceptadaAt: Date;

  @Column('timestamp', { nullable: true })
  ultimoLogin: Date;

  @Column('uuid', { nullable: true })
  estudianteId: string;

  @Column('varchar', { length: 10, nullable: true })
  resetCodigo: string;

  @Column('timestamp', { nullable: true })
  resetExpira: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relations
  @ManyToOne(() => Colegio, (colegio) => colegio.usuarios, { onDelete: 'CASCADE' })
  colegio: Colegio;

  @ManyToOne(() => Rol)
  rol: Rol;

  @OneToMany(() => Nota, (nota) => nota.profesor)
  notasCreadas: Nota[];

  @OneToMany(() => Recuperacion, (rec) => rec.profesor)
  recuperaciones: Recuperacion[];

  @OneToMany(() => ProfesorAsignacion, (asignacion) => asignacion.profesor)
  asignaciones: ProfesorAsignacion[];

  @OneToMany(() => CoordinadorSede, (cs) => cs.coordinador)
  sedes: CoordinadorSede[];

  @OneToMany(() => Auditoria, (auditoria) => auditoria.usuario)
  auditorias: Auditoria[];
}