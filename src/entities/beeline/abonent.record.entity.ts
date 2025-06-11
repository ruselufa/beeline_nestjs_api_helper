import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Abonent } from './abonent.entity';

@Entity({ name: 'user_record' })
export class AbonentRecord {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	@IsNotEmpty()
	@IsString()
	beelineId: string;

	@Column()
	@IsNotEmpty()
	@IsString()
	beelineExternalId: string;

	@Column({ nullable: true })
	@IsString()
	callId: string;

	@Column()
	@IsNotEmpty()
	@IsString()
	phone: string;

	@Column()
	@IsNotEmpty()
	@IsEnum(['OUTBOUND', 'INBOUND'])
	@IsString()
	direction: string;

	@Column()
	@IsNotEmpty()
	date: Date;

	@Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	createdAt: Date;

	@Column({
		name: 'updated_at',
		type: 'timestamp',
		default: () => 'CURRENT_TIMESTAMP',
		onUpdate: 'CURRENT_TIMESTAMP',
	})
	updatedAt: Date;

	@Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
	deletedAt: Date;

	@Column()
	@IsNotEmpty()
	@IsNumber()
	duration: number; //milliseconds

	@Column()
	@IsNotEmpty()
	@IsNumber()
	fileSize: number; //bytes

	@Column()
	@IsNotEmpty()
	@IsString()
	comment: string;

	@Column({ type: 'boolean', default: false })
	beeline_download: boolean;

	@Column({ type: 'boolean', default: false })
	transcribe_processed: boolean;

	@Column({ type: 'boolean', default: false })
	deepseek_analysed: boolean;

	@Column({ type: 'boolean', default: false })
	google_sheets_export: boolean;

	@Column({ type: 'boolean', default: false })
	to_short: boolean;

	@Column({ type: 'jsonb', nullable: true })
	deepseek_analysis: any;

	@ManyToOne(() => Abonent, (abonent) => abonent.abonentRecords)
	abonent: Abonent;
}
