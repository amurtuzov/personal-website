import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header = req.headers['authorization'] || '';
    const token = header.replace(/^Bearer\s*/i, '');
    const payload = this.auth.verifyJwt(token);
    if (!payload) throw new UnauthorizedException();
    req.user = { id: payload.sub, email: payload.email };
    return true;
  }
}