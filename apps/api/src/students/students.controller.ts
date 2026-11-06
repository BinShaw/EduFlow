import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../common/auth.types';
import { requireRole } from '../common/require-role';
import { SessionGuard } from '../common/session.guard';
import { CreateStudentDto, UpdateStudentDto } from './students.dto';
import { StudentsService } from './students.service';

@Controller('students')
@UseGuards(SessionGuard)
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list(
    @Req() req: AuthRequest,
    @Query('search') search = '',
    @Query('scope') scope = 'mine',
    @Query('page') page = '1',
  ) {
    requireRole(req.user, UserRole.ADMIN);
    return this.students.list(req.user.id, search, scope === 'all', Number(page));
  }

  @Get('dashboard/summary')
  summary(@Req() req: AuthRequest, @Query('scope') scope = 'mine') {
    if (req.user.role === UserRole.TEACHER)
      throw new BadRequestException('Use the teacher schedule endpoint.');
    return this.students.dashboard(req.user.id, scope === 'all');
  }

  @Get(':id')
  detail(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    requireRole(req.user, UserRole.ADMIN);
    return this.students.detail(req.user.id, id);
  }

  @Post()
  create(
    @Req() req: AuthRequest,
    @Body() body: CreateStudentDto,
    @Headers('idempotency-key') key?: string,
  ) {
    requireRole(req.user, UserRole.ADMIN);
    if (key && !/^[a-f0-9-]{36}$/i.test(key))
      throw new BadRequestException('Invalid idempotency key.');
    return this.students.create(req.user.id, body, key);
  }

  @Patch(':id')
  update(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateStudentDto,
  ) {
    requireRole(req.user, UserRole.ADMIN);
    return this.students.update(req.user.id, id, body);
  }
}
