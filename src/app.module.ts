import { Module } from '@nestjs/common';
import { PathfindingController } from './paths/paths.controller';
import { TasksController } from './tasks/tasks.controller';
import { PathfindingModule } from './paths/paths.module';
import { TasksModule } from './tasks/tasks.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    DatabaseModule,
    PathfindingModule,
    TasksModule,
  ],
  controllers: [PathfindingController, TasksController],
  providers: [],
})
export class AppModule {}
