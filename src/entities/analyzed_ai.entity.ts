import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('analyzed_ai')
export class AnalyzedAi {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversationId: string;

  @Column()
  department: string;

  @Column('text')
  originalText: string;

  @Column('jsonb')
  analysisResult: Record<string, any>;

  @Column()
  clientId: string;

  @Column({ nullable: true })
  clientName: string;

  @Column({ nullable: true })
  clientPhone: string;

  @CreateDateColumn()
  createdAt: Date;
} 