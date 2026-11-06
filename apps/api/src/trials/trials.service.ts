import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadStage, Prisma, TrialStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { studentHasConflict } from '../common/booking-rules';
import { CreateTrialDto, RecordOutcomeDto } from './trials.dto';
import {
  melbourneDateKey,
  melbourneDayStart,
  melbourneLocalDateTimeToUtc,
} from '../common/timezone';

@Injectable()
export class TrialsService {
  constructor(private readonly prisma: PrismaService) {}

  async book(ownerId: string, body: CreateTrialDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const lead = await tx.lead.findUnique({
          where: { id: body.leadId },
          include: { student: true },
        });
        if (!lead) throw new NotFoundException('Inquiry not found.');
        if (lead.student.ownerAdminId !== ownerId)
          throw new ForbiddenException('You may only schedule students assigned to you.');
        const session = await tx.lessonSession.findUnique({
          where: { id: body.lessonSessionId },
          include: { classGroup: true, teacher: { select: { isActive: true, role: true } } },
        });
        if (!session) throw new NotFoundException('Class session not found.');
        if (
          !session.classGroup.isActive ||
          !session.teacher.isActive ||
          session.teacher.role !== UserRole.TEACHER
        )
          throw new ConflictException('This class or teacher is not available for booking.');
        await tx.$queryRaw`SELECT id FROM "Student" WHERE id = ${lead.studentId}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${session.teacherId}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "LessonSession" WHERE id = ${session.id}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "Lead" WHERE id = ${lead.id}::uuid FOR UPDATE`;
        const current = await tx.lessonSession.findUnique({ where: { id: session.id } });
        if (!current || current.status !== 'SCHEDULED' || current.startsAt <= new Date())
          throw new ConflictException('This class session can no longer be booked.');
        const existingBooking = await tx.trialBooking.findFirst({
          where: { leadId: lead.id, status: TrialStatus.BOOKED },
        });
        if (existingBooking)
          throw new ConflictException('This inquiry already has an active trial.');
        const localDate = new Date(`${melbourneDateKey(current.startsAt)}T00:00:00.000Z`);
        const [classConflict, teacherConflict, bookedTrials, enrolledCount] = await Promise.all([
          studentHasConflict(tx, lead.studentId, current),
          tx.lessonSession.findFirst({
            where: {
              id: { not: current.id },
              teacherId: current.teacherId,
              status: 'SCHEDULED',
              startsAt: { lt: current.endsAt },
              endsAt: { gt: current.startsAt },
            },
            select: { id: true },
          }),
          tx.trialBooking.count({
            where: { lessonSessionId: current.id, status: TrialStatus.BOOKED },
          }),
          tx.enrollment.count({
            where: {
              classGroupId: current.classGroupId,
              startsOn: { lte: localDate },
              OR: [{ endsOn: null }, { endsOn: { gte: localDate } }],
            },
          }),
        ]);
        if (classConflict)
          throw new ConflictException('The student has another class at this time.');
        if (teacherConflict)
          throw new ConflictException('The teacher is already assigned to an overlapping class.');
        if (bookedTrials + enrolledCount >= current.capacity)
          throw new ConflictException('This class is full.');
        const created = await tx.trialBooking.create({
          data: { leadId: lead.id, lessonSessionId: current.id, createdById: ownerId },
          include: {
            lessonSession: {
              include: {
                classGroup: { include: { course: true } },
                teacher: { select: { name: true } },
              },
            },
          },
        });
        await tx.lead.update({ where: { id: lead.id }, data: { stage: LeadStage.TRIAL_BOOKED } });
        await tx.auditLog.create({
          data: { actorId: ownerId, action: 'TRIAL_BOOKED', resourceId: created.id },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async cancel(ownerId: string, id: string, reason: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const booking = await tx.trialBooking.findUnique({
          where: { id },
          include: { lead: { include: { student: true } }, lessonSession: true },
        });
        if (!booking) throw new NotFoundException('Trial booking not found.');
        if (booking.lead.student.ownerAdminId !== ownerId)
          throw new ForbiddenException('You may only change students assigned to you.');
        await tx.$queryRaw`SELECT id FROM "Student" WHERE id = ${booking.lead.studentId}::uuid FOR UPDATE`;
        if (booking.status !== TrialStatus.BOOKED)
          throw new ConflictException('Only an active booking can be cancelled.');
        if (booking.lessonSession.startsAt <= new Date())
          throw new ConflictException(
            'This trial has already started. Record attendance after it ends.',
          );
        const updated = await tx.trialBooking.update({
          where: { id },
          data: { status: TrialStatus.CANCELLED, cancelledReason: reason.trim() },
        });
        const anotherActive = await tx.trialBooking.findFirst({
          where: { leadId: booking.leadId, status: TrialStatus.BOOKED },
        });
        if (!anotherActive)
          await tx.lead.update({
            where: { id: booking.leadId },
            data: { stage: LeadStage.CONTACTED },
          });
        await tx.auditLog.create({
          data: { actorId: ownerId, action: 'TRIAL_CANCELLED', resourceId: id },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async recordOutcome(ownerId: string, id: string, body: RecordOutcomeDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const booking = await tx.trialBooking.findUnique({
          where: { id },
          include: { lead: { include: { student: true } }, lessonSession: true },
        });
        if (!booking) throw new NotFoundException('Trial booking not found.');
        if (booking.lead.student.ownerAdminId !== ownerId)
          throw new ForbiddenException('You may only update students assigned to you.');
        await tx.$queryRaw`SELECT id FROM "Student" WHERE id = ${booking.lead.studentId}::uuid FOR UPDATE`;
        if (booking.status !== TrialStatus.BOOKED)
          throw new ConflictException('This trial has already been resolved.');
        if (booking.lessonSession.endsAt > new Date())
          throw new ConflictException('Record the result after the trial session has ended.');
        let dueAt: Date;
        try {
          dueAt = melbourneLocalDateTimeToUtc(body.nextFollowUpAt, 9, 0);
        } catch {
          throw new BadRequestException('Follow-up date is invalid.');
        }
        if (dueAt < melbourneDayStart())
          throw new BadRequestException('Choose today or a future follow-up date.');
        const status = body.status === 'ATTENDED' ? TrialStatus.ATTENDED : TrialStatus.NO_SHOW;
        const [updated] = await Promise.all([
          tx.trialBooking.update({
            where: { id },
            data: { status, outcome: body.status, notes: body.notes?.trim() || null },
          }),
          tx.lead.update({
            where: { id: booking.leadId },
            data: { stage: LeadStage.TRIAL_DONE, lastContactAt: new Date(), nextFollowUpAt: dueAt },
          }),
        ]);
        await tx.followUp.create({
          data: {
            studentId: booking.lead.studentId,
            leadId: booking.leadId,
            trialBookingId: id,
            createdById: ownerId,
            action: body.followUpAction.trim(),
            dueAt,
            messageDraft: body.messageDraft?.trim() || null,
          },
        });
        await tx.auditLog.create({
          data: { actorId: ownerId, action: 'TRIAL_OUTCOME_RECORDED', resourceId: id },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listFollowUps(ownerId: string, all: boolean, status: string) {
    const selectedStatus = ['OPEN', 'COMPLETED', 'CANCELLED'].includes(status) ? status : 'OPEN';
    return this.prisma.followUp.findMany({
      where: {
        status: selectedStatus as any,
        ...(all ? {} : { student: { ownerAdminId: ownerId } }),
      },
      orderBy: [{ dueAt: 'asc' }],
      take: 100,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            yearLevel: true,
            ownerAdminId: true,
          },
        },
        lead: { select: { id: true, stage: true } },
        trialBooking: { select: { id: true, status: true } },
      },
    });
  }

  async completeFollowUp(ownerId: string, id: string, note: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const followUp = await tx.followUp.findUnique({
          where: { id },
          include: { student: { select: { ownerAdminId: true } } },
        });
        if (!followUp) throw new NotFoundException('Follow-up not found.');
        if (followUp.student.ownerAdminId !== ownerId)
          throw new ForbiddenException('You may only complete follow-ups for your students.');
        if (followUp.status !== 'OPEN')
          throw new ConflictException('This follow-up is already closed.');
        const changed = await tx.followUp.updateMany({
          where: { id, status: 'OPEN', student: { ownerAdminId: ownerId } },
          data: { status: 'COMPLETED', completedAt: new Date(), completionNote: note.trim() },
        });
        if (changed.count !== 1)
          throw new ConflictException('This follow-up has changed. Refresh and try again.');
        if (followUp.leadId) {
          const next = await tx.followUp.findFirst({
            where: { leadId: followUp.leadId, status: 'OPEN' },
            orderBy: { dueAt: 'asc' },
          });
          await tx.lead.update({
            where: { id: followUp.leadId },
            data: { nextFollowUpAt: next?.dueAt || null, lastContactAt: new Date() },
          });
        }
        await tx.auditLog.create({
          data: { actorId: ownerId, action: 'FOLLOW_UP_COMPLETED', resourceId: id },
        });
        return tx.followUp.findUnique({ where: { id } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
