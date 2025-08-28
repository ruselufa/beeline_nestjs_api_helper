import 'reflect-metadata';
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('managers')
export class ManagerModel {
	@Index({ unique: true })
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 255, nullable: true, name: 'email' })
	email: string;

	@Column({ type: 'varchar', length: 20, nullable: false, name: 'phone' })
	phone: string;

	@Index()
	@Column({ type: 'varchar', length: 255, nullable: false, name: 'user_id' })
	userId: string;

	@Column({ type: 'varchar', length: 255, nullable: true, name: 'first_name' })
	firstName: string;

	@Column({ type: 'varchar', length: 255, nullable: true, name: 'last_name' })
	lastName: string;

	@Column({ type: 'varchar', length: 100, nullable: false, name: 'department' })
	department: string;

	@Column({ type: 'varchar', length: 10, nullable: false, name: 'extension' })
	extension: string;

	@Column({
		type: 'timestamp',
		default: () => 'CURRENT_TIMESTAMP',
		name: 'created_at',
	})
	createdAt: Date;

	@Column({
		type: 'timestamp',
		default: () => 'CURRENT_TIMESTAMP',
		onUpdate: 'CURRENT_TIMESTAMP',
		name: 'updated_at',
	})
	updatedAt: Date;
}
