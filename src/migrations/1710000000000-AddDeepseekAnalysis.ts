import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeepseekAnalysis1710000000000 implements MigrationInterface {
    name = 'AddDeepseekAnalysis1710000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_record" ADD "deepseek_analysis" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_record" DROP COLUMN "deepseek_analysis"`);
    }
} 