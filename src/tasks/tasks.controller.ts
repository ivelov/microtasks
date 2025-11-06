import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/createTask.dto';
import { TaskQueryDto } from './dto/taskQuery.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto) {
    // In a real app, get userId from @Req() req.user (from an AuthGuard)
    const mockUserId = 'mock-user-id-123';
    return this.tasksService.create(createTaskDto, mockUserId);
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
