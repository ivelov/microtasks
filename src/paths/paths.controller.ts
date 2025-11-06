import { Body, Controller, Post } from '@nestjs/common';
import { PathfindingService } from './paths.service';
import { OptimizePathDto } from './dto/optimizePath.dto';

@Controller('pathfinding')
export class PathfindingController {
  constructor(private readonly pathfindingService: PathfindingService) {}

  @Post('optimize')
  optimizePath(@Body() optimizePathDto: OptimizePathDto) {
    return this.pathfindingService.findOptimalPath(optimizePathDto);
  }
}
