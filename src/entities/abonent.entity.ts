import { IsNotEmpty, IsString } from 'class-validator';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AbonentRecord } from './abonent.record.entity';

@Entity()
export class Abonent {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	@IsNotEmpty()
	@IsString()
	userId: string;

	@Column()
	@IsNotEmpty()
	@IsString()
	phone: string;

	@Column()
	@IsNotEmpty()
	@IsString()
	firstName: string;

	@Column()
	@IsNotEmpty()
	@IsString()
	lastName: string;

	@Column()
	@IsNotEmpty()
	@IsString()
	email: string;

	@Column()
	@IsNotEmpty()
	@IsString()
	department: string;

	@Column()
	@IsNotEmpty()
	@IsString()
	extension: string;

	@Column({
		name: 'created_at',
		type: 'timestamp',
		default: () => 'CURRENT_TIMESTAMP',
		onUpdate: 'CURRENT_TIMESTAMP',
	})
	createdAt: Date;

	@Column({
		name: 'updated_at',
		type: 'timestamp',
		default: () => 'CURRENT_TIMESTAMP',
		onUpdate: 'CURRENT_TIMESTAMP',
	})
	updatedAt: Date;

	@Column({ name: 'deleted_at', nullable: true })
	deletedAt: Date;

	@Column({ default: true })
	active: boolean;

	@OneToMany(() => AbonentRecord, (abonent) => abonent.abonent)
	abonentRecords: AbonentRecord[];
}
