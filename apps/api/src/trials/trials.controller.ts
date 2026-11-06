import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../common/auth.types';
import { requireRole } from '../common/require-role';
import { SessionGuard } from '../common/session.guard';
import { TrialsService } from './trials.service';
import {
  CancelTrialDto,
  CompleteFollowUpDto,
  CreateTrialDto,
  RecordOutcomeDto,
} from './trials.dto';

@Controller()
@UseGuards(SessionGuard)
export class TrialsController {
  constructor(private readonly trials: TrialsService) {}

  @Post('trials')
  book(@Req() req: AuthRequest, @Body() body: CreateTrialDto) {
    requireRole(req.user, UserRole.ADMIN);
    return this.trials.book(req.user.id, body);
  }

  @Post('trials/:id/cancel')
  cancel(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelTrialDto,
  ) {
    requireRole(req.user, UserRole.ADMIN);
    return this.trials.cancel(req.user.id, id, body.reason);
  }

  @Post('trials/:id/outcome')
  outcome(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordOutcomeDto,
  ) {
    requireRole(req.user, UserRole.ADMIN);
    return this.trials.recordOutcome(req.user.id, id, body);
  }

  @Get('follow-ups')
  followUps(
    @Req() req: AuthRequest,
    @Query('scope') scope = 'mine',
    @Query('status') status = 'OPEN',
  ) {
    requireRole(req.user, UserRole.ADMIN);
    return this.trials.listFollowUps(req.user.id, scope === 'all', status);
  }

  @Patch('follow-ups/:id/complete')
  complete(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CompleteFollowUpDto,
  ) {
    requireRole(req.user, UserRole.ADMIN);
    return this.trials.completeFollowUp(req.user.id, id, body.completionNote);
  }
}
