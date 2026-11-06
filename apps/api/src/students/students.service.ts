import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { LeadStage, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateStudentDto, UpdateStudentDto } from './students.dto';
import { melbourneDayStart, melbourneNextDayStart } from '../common/timezone';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string, search: string, all: boolean, pageInput: number) {
    const page = Number.isFinite(pageInput)
      ? Math.min(Math.max(1, Math.trunc(pageInput)), 1000)
      : 1;
    search = search.slice(0, 200);
    const where: Prisma.StudentWhereInput = {
      ...(all ? {} : { ownerAdminId: ownerId }),
      ...(search.trim()
        ? {
            OR: [
              { firstName: { contains: search.trim(), mode: 'insensitive' } },
              { lastName: { contains: search.trim(), mode: 'insensitive' } },
              {
                guardians: {
                  some: { guardian: { name: { contains: search.trim(), mode: 'insensitive' } } },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * 30,
        take: 30,
        include: {
          owner: { select: { id: true, name: true } },
          guardians: { where: { isPrimary: true }, include: { guardian: true } },
          leads: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, stage: true, nextFollowUpAt: true },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);
    return { items, total, page, pageSize: 30 };
  }

  async detail(ownerId: string, id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        guardians: { include: { guardian: true } },
        leads: {
          orderBy: { createdAt: 'desc' },
          include: {
            trials: {
              orderBy: { createdAt: 'desc' },
              include: {
                lessonSession: {
                  include: {
                    classGroup: { include: { course: true } },
                    teacher: { select: { id: true, name: true } },
                  },
                },
              },
            },
            followUps: { orderBy: { dueAt: 'desc' }, take: 10 },
          },
        },
        followUps: { orderBy: { dueAt: 'asc' }, take: 10 },
      },
    });
    if (!student) throw new NotFoundException('Student not found.');
    return { ...student, canEdit: student.ownerAdminId === ownerId };
  }

  async create(ownerId: string, body: CreateStudentDto, requestKey?: string) {
    const createRequestKey = requestKey ? `${ownerId}:${requestKey}` : undefined;
    const created = await this.prisma.$transaction(async (tx) => {
      if (createRequestKey) {
        const previous = await tx.student.findUnique({ where: { createRequestKey } });
        if (previous) return previous;
      }
      const guardian = await tx.guardian.create({
        data: {
          name: body.guardian.name.trim(),
          email: body.guardian.email?.trim().toLowerCase() || null,
          phone: body.guardian.phone?.trim() || null,
        },
      });
      const student = await tx.student.create({
        data: {
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          yearLevel: body.yearLevel,
          ownerAdminId: ownerId,
          createRequestKey,
          guardians: {
            create: { guardianId: guardian.id, relationship: 'Parent', isPrimary: true },
          },
          leads: {
            create: {
              createdById: ownerId,
              source: body.source?.trim() || 'Unknown',
              stage: LeadStage.NEW,
              notes: body.notes?.trim() || null,
            },
          },
        },
        include: { guardians: { include: { guardian: true } }, leads: true },
      });
      await tx.auditLog.create({
        data: { actorId: ownerId, action: 'STUDENT_CREATED', resourceId: student.id },
      });
      return student;
    });
    return created;
  }

  async update(ownerId: string, id: string, body: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true, ownerAdminId: true },
    });
    if (!student) throw new NotFoundException('Student not found.');
    if (student.ownerAdminId !== ownerId)
      throw new ForbiddenException('You may only edit students assigned to you.');
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.student.update({
        where: { id, ownerAdminId: ownerId },
        data: {
          firstName: body.firstName?.trim(),
          lastName: body.lastName?.trim(),
          yearLevel: body.yearLevel,
        },
      });
      await tx.auditLog.create({
        data: { actorId: ownerId, action: 'STUDENT_UPDATED', resourceId: id },
      });
      return changed;
    });
  }

  async dashboard(ownerId: string, all: boolean) {
    const today = melbourneDayStart();
    const sevenDays = melbourneNextDayStart(new Date(today.getTime() + 6 * 86400000));
    const tomorrow = melbourneNextDayStart(today);
    const owned: Prisma.StudentWhereInput = all ? {} : { ownerAdminId: ownerId };
    const [
      students,
      overdue,
      dueToday,
      upcoming,
      recentTrials,
      overdueCount,
      dueTodayCount,
      upcomingCount,
    ] = await Promise.all([
      this.prisma.student.count({ where: owned }),
      this.prisma.followUp.findMany({
        where: { status: 'OPEN', dueAt: { lt: today }, student: owned },
        orderBy: { dueAt: 'asc' },
        take: 12,
        include: { student: true, createdBy: { select: { name: true } } },
      }),
      this.prisma.followUp.findMany({
        where: { status: 'OPEN', dueAt: { gte: today, lt: tomorrow }, student: owned },
        orderBy: { dueAt: 'asc' },
        take: 12,
        include: { student: true },
      }),
      this.prisma.lessonSession.findMany({
        where: {
          status: 'SCHEDULED',
          startsAt: { gte: today, lt: sevenDays },
          trials: { some: { status: 'BOOKED', lead: { student: owned } } },
        },
        orderBy: { startsAt: 'asc' },
        take: 12,
        include: {
          classGroup: { include: { course: true } },
          teacher: { select: { name: true } },
          trials: {
            where: { status: 'BOOKED', lead: { student: owned } },
            include: { lead: { include: { student: true } } },
          },
        },
      }),
      this.prisma.trialBooking.findMany({
        where: { status: { in: ['ATTENDED', 'NO_SHOW'] }, lead: { student: owned } },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        include: {
          lead: { include: { student: true } },
          lessonSession: { include: { classGroup: { include: { course: true } } } },
        },
      }),
      this.prisma.followUp.count({
        where: { status: 'OPEN', dueAt: { lt: today }, student: owned },
      }),
      this.prisma.followUp.count({
        where: { status: 'OPEN', dueAt: { gte: today, lt: tomorrow }, student: owned },
      }),
      this.prisma.trialBooking.count({
        where: {
          status: 'BOOKED',
          lead: { student: owned },
          lessonSession: { status: 'SCHEDULED', startsAt: { gte: today, lt: sevenDays } },
        },
      }),
    ]);
    return {
      counts: {
        students,
        overdue: overdueCount,
        dueToday: dueTodayCount,
        upcomingTrials: upcomingCount,
      },
      overdue,
      dueToday,
      upcoming,
      recentTrials,
    };
  }
}
