import { IsNotEmpty, IsString } from 'class-validator';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'client' })
export class Client {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	@IsNotEmpty()
	@IsString()
	clientId: string;

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
}
