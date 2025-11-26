import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeDescriptionNullable1763917202136 implements MigrationInterface {
    name = 'MakeDescriptionNullable1763917202136'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "description" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "description" SET NOT NULL`);
    }

}
