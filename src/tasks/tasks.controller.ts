import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/createTask.dto';
import { TaskQueryDto } from './dto/taskQuery.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    const userId = req.user.userId;
    return this.tasksService.create(createTaskDto, userId);
  }

  @Get('nearby')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(OptionalJwtAuthGuard)
  findNearby(@Query() query: TaskQueryDto, @Request() req) {
    const userId = req.user?.userId;
    return this.tasksService.findNearby(query, userId);
  }
}
