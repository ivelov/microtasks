import { Body, Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/createTask.dto';
import { TaskQueryDto } from './dto/taskQuery.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    const userId = req.user.userId;
    return this.tasksService.create(createTaskDto, userId);
  }

  @Get()
  findAll() {
    return this.tasksService.findAll();
  }

  /**
   * Finds tasks within a given radius
   * e.g., /tasks/nearby?lat=40.71&lng=-74.00&radius=5
   */
  @Get('nearby')
  findNearby(@Query() query: TaskQueryDto) {
    return this.tasksService.findNearby(query);
  }
}
