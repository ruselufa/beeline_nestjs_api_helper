import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlagsToUserRecord1710000000000 implements MigrationInterface {
  name = 'AddFlagsToUserRecord1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_record" ADD "beeline_download" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "user_record" ADD "transcribe_processed" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "user_record" ADD "deepseek_analysed" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "user_record" ADD "to_short" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_record" DROP COLUMN "to_short"`);
    await queryRunner.query(`ALTER TABLE "user_record" DROP COLUMN "deepseek_analysed"`);
    await queryRunner.query(`ALTER TABLE "user_record" DROP COLUMN "transcribe_processed"`);
    await queryRunner.query(`ALTER TABLE "user_record" DROP COLUMN "beeline_download"`);
  }
} 