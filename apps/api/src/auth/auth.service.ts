import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  private readonly attempts = new Map<string, number[]>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(emailInput: string, password: string, address = 'unknown') {
    this.enforceRateLimit(address);
    if (!emailInput || !password)
      throw new UnauthorizedException('Email or password is incorrect.');
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.isActive || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }
    const token = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '2h',
        issuer: 'eduflow-api',
        audience: 'eduflow-web',
      },
    );
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  private enforceRateLimit(address: string) {
    const now = Date.now();
    if (this.attempts.size > 512) {
      for (const [key, times] of this.attempts)
        if (times.every((time) => now - time >= 60000)) this.attempts.delete(key);
      if (this.attempts.size > 4096) this.attempts.delete(this.attempts.keys().next().value!);
    }
    const recent = (this.attempts.get(address) || []).filter((time) => now - time < 60_000);
    if (recent.length >= 12)
      throw new HttpException(
        'Too many sign-in attempts. Please wait a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    recent.push(now);
    this.attempts.set(address, recent);
  }
}
