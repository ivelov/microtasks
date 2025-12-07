import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { PathfindingService } from './paths.service';
import { OptimizePathDto } from './dto/optimizePath.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('pathfinding')
export class PathfindingController {
  constructor(private readonly pathfindingService: PathfindingService) {}

  @Post('optimize')
  @UseGuards(JwtAuthGuard)
  optimizePath(@Body() optimizePathDto: OptimizePathDto, @Request() req) {
    const userId = req.user.userId;
    return this.pathfindingService.findOptimalPath(
      { ...optimizePathDto },
      userId,
    );
  }
}
