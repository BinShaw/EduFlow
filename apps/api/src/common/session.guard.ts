import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { AuthRequest } from './auth.types';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.eduflow_session;
    if (!token) throw new UnauthorizedException('Please sign in.');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET,
        issuer: 'eduflow-api',
        audience: 'eduflow-web',
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });
      if (!user?.isActive) throw new Error('inactive');
      request.user = { id: user.id, email: user.email, name: user.name, role: user.role };
      return true;
    } catch {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
  }
}
