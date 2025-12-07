import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // If there's no user (no token or invalid token), just return null
    // Don't throw an error - allow the request to continue
    if (err || !user) {
      return null;
    }
    return user;
  }
}
