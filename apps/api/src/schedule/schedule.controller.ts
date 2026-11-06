import { Controller, Get, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../common/auth.types';
import { requireRole } from '../common/require-role';
import { SessionGuard } from '../common/session.guard';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
@UseGuards(SessionGuard)
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get('available')
  available(@Req() req: AuthRequest, @Query('studentId', ParseUUIDPipe) studentId: string) {
    requireRole(req.user, UserRole.ADMIN);
    return this.schedule.availableSessions(req.user.id, studentId);
  }

  @Get('teacher/today')
  today(@Req() req: AuthRequest) {
    requireRole(req.user, UserRole.TEACHER);
    return this.schedule.teacherToday(req.user.id);
  }
}
