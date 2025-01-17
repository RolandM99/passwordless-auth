import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor() {
    super();
  }

  handleRequest(err: any, user: any, info: any) {
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('Token has expired');
    }

    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException('Invalid token');
    }

    if (err || !user) {
      throw new UnauthorizedException('Authentication failed');
    }

    return user;
  }

  // Optional: Override canActivate if you need custom logic before JWT validation
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('No token provided');
    }

    const [type] = authHeader.split(' ');
    if (type !== 'Bearer') {
      throw new UnauthorizedException('Invalid token format');
    }
    return super.canActivate(context) as Promise<boolean>;
  }
}
