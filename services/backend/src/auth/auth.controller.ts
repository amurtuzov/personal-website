import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @Throttle({ auth: { limit: 10, ttl: 60 } })
  async register(@Body() body: RegisterDto) {
    const user = await this.auth.createUser(body.email, body.password, body.name);
    const token = this.auth.signJwt({ sub: user.id, email: user.email });
    return {
      user: { id: user.id, email: user.email },
      accessToken: token,
      expiresInMs: 8 * 60 * 60 * 1000,
    };
  }

  @Post('login')
  @Throttle({ auth: { limit: 10, ttl: 60 } })
  async login(@Body() body: LoginDto) {
    const user = await this.auth.validateUser(body.email, body.password);
    const token = this.auth.signJwt({ sub: user.id, email: user.email });
    return {
      user,
      accessToken: token,
      expiresInMs: 8 * 60 * 60 * 1000,
    };
  }
}
