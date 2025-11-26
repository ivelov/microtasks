import { Module } from '@nestjs/common';
import { PathfindingController } from './paths.controller';
import { PathfindingService } from './paths.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Task } from 'src/tasks/task.entity';
import { TasksModule } from 'src/tasks/tasks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User]), TasksModule],
  controllers: [PathfindingController],
  providers: [PathfindingService],
  exports: [PathfindingService],
})
export class PathfindingModule {}
