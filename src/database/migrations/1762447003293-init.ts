import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1762447003293 implements MigrationInterface {
    name = 'Init1762447003293'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "skill" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, CONSTRAINT "PK_a0d33334424e64fb78dc3ce7196" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."task_status_enum" AS ENUM('open', 'assigned', 'completed')`);
        await queryRunner.query(`CREATE TABLE "task" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text NOT NULL, "reward" numeric NOT NULL, "latitude" numeric(10,6) NOT NULL, "longitude" numeric(10,6) NOT NULL, "estimated_duration_minutes" integer NOT NULL, "status" "public"."task_status_enum" NOT NULL DEFAULT 'open', "createdById" uuid, "assignedToId" uuid, CONSTRAINT "PK_fb213f79ee45060ba925ecd576e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_skills_skill" ("userId" uuid NOT NULL, "skillId" uuid NOT NULL, CONSTRAINT "PK_972b9abaae51dbb33e482d81a26" PRIMARY KEY ("userId", "skillId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b5cce6242aae7bce521a76a3be" ON "user_skills_skill" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c7e4f0b8d58a56f71dd097d754" ON "user_skills_skill" ("skillId") `);
        await queryRunner.query(`CREATE TABLE "task_required_skills_skill" ("taskId" uuid NOT NULL, "skillId" uuid NOT NULL, CONSTRAINT "PK_82eedefa9f68ed11b749cb5e5de" PRIMARY KEY ("taskId", "skillId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_72949cd63e57433837ba811459" ON "task_required_skills_skill" ("taskId") `);
        await queryRunner.query(`CREATE INDEX "IDX_1d5f39ba633096b7dde606c615" ON "task_required_skills_skill" ("skillId") `);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_91d76dd2ae372b9b7dfb6bf3fd2" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_fd5f652e2fcdc4a5ab30aaff7a7" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_skills_skill" ADD CONSTRAINT "FK_b5cce6242aae7bce521a76a3be1" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_skills_skill" ADD CONSTRAINT "FK_c7e4f0b8d58a56f71dd097d7546" FOREIGN KEY ("skillId") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "task_required_skills_skill" ADD CONSTRAINT "FK_72949cd63e57433837ba8114596" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "task_required_skills_skill" ADD CONSTRAINT "FK_1d5f39ba633096b7dde606c6155" FOREIGN KEY ("skillId") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_required_skills_skill" DROP CONSTRAINT "FK_1d5f39ba633096b7dde606c6155"`);
        await queryRunner.query(`ALTER TABLE "task_required_skills_skill" DROP CONSTRAINT "FK_72949cd63e57433837ba8114596"`);
        await queryRunner.query(`ALTER TABLE "user_skills_skill" DROP CONSTRAINT "FK_c7e4f0b8d58a56f71dd097d7546"`);
        await queryRunner.query(`ALTER TABLE "user_skills_skill" DROP CONSTRAINT "FK_b5cce6242aae7bce521a76a3be1"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_fd5f652e2fcdc4a5ab30aaff7a7"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_91d76dd2ae372b9b7dfb6bf3fd2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1d5f39ba633096b7dde606c615"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_72949cd63e57433837ba811459"`);
        await queryRunner.query(`DROP TABLE "task_required_skills_skill"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c7e4f0b8d58a56f71dd097d754"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b5cce6242aae7bce521a76a3be"`);
        await queryRunner.query(`DROP TABLE "user_skills_skill"`);
        await queryRunner.query(`DROP TABLE "task"`);
        await queryRunner.query(`DROP TYPE "public"."task_status_enum"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "skill"`);
    }

}
