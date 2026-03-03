import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { Inject } from '@nestjs/common';
import { PrismaClient } from '@packages/database';
import { PRISMA } from '../prisma/prisma.module';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA) private prisma: PrismaClient,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await compare(pass, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return { id: user.id, email: user.email };
  }

  async createUser(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const hashed = await hash(password, 10);
    return this.prisma.user.create({ data: { email, password: hashed, name } });
  }

  signJwt(payload: any) {
    const jwt = require('jsonwebtoken');
    const secret = this.config.get<string>('JWT_SECRET');
    return jwt.sign(payload, secret, { expiresIn: '8h' });
  }

  verifyJwt(token: string) {
    const jwt = require('jsonwebtoken');
    const secret = this.config.get<string>('JWT_SECRET');
    try {
      return jwt.verify(token, secret);
    } catch (e) {
      return null;
    }
  }
}
