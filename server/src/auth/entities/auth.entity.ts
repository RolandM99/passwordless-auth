import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
  Base64URLString,
} from '@simplewebauthn/server';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  webauthnId: Base64URLString;

  @Column({ type: 'varchar', nullable: true })
  currentChallenge?: string | null;

  @OneToMany(() => Authenticator, (authenticator) => authenticator.user)
  authenticators: Authenticator[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity()
export class Authenticator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  credentialId: Base64URLString;

  @Column({ type: 'bytea' })
  credentialPublicKey: Uint8Array;

  @ManyToOne(() => User, (user) => user.authenticators, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  webauthnUserId: Base64URLString;

  @Column({ type: 'bigint' })
  counter: number;

  @Column({
    type: 'varchar',
    length: 32,
  })
  deviceType: CredentialDeviceType;

  @Column()
  backedUp: boolean;

  @Column('simple-array', { nullable: true })
  transports?: AuthenticatorTransportFuture[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
