import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../common/auth.types';
import { requireRole } from '../common/require-role';
import { SessionGuard } from '../common/session.guard';
import { FollowUpDraftDto } from './ai.dto';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(SessionGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}
  @Post('follow-up-draft')
  draft(@Req() req: AuthRequest, @Body() body: FollowUpDraftDto) {
    requireRole(req.user, UserRole.ADMIN);
    return this.ai.followUpDraft(
      req.user.id,
      body.trialBookingId,
      body.notes,
      body.outputLanguage || 'en-AU',
    );
  }
}
