import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { studentHasConflict } from '../common/booking-rules';
import { melbourneDateKey, melbourneDayStart, melbourneNextDayStart } from '../common/timezone';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async availableSessions(ownerId: string, studentId: string) {
    if (!studentId) throw new NotFoundException('Choose a student first.');
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, ownerAdminId: true },
    });
    if (!student) throw new NotFoundException('Student not found.');
    if (student.ownerAdminId !== ownerId)
      throw new ForbiddenException('You may only schedule students assigned to you.');
    const now = new Date();
    const end = new Date(now.getTime() + 21 * 86400000);
    const sessions = await this.prisma.lessonSession.findMany({
      where: {
        status: 'SCHEDULED',
        startsAt: { gte: now, lt: end },
        classGroup: { isActive: true },
        teacher: { isActive: true, role: 'TEACHER' },
      },
      orderBy: { startsAt: 'asc' },
      take: 100,
      include: {
        teacher: { select: { id: true, name: true } },
        classGroup: { include: { course: true } },
      },
    });
    const items = await Promise.all(
      sessions.map(async (session) => {
        const localDate = new Date(`${melbourneDateKey(session.startsAt)}T00:00:00.000Z`);
        const [bookedTrials, occupiedEnrollments, studentConflict, teacherConflict] =
          await Promise.all([
            this.prisma.trialBooking.count({
              where: { lessonSessionId: session.id, status: 'BOOKED' },
            }),
            this.prisma.enrollment.count({
              where: {
                classGroupId: session.classGroupId,
                startsOn: { lte: localDate },
                OR: [{ endsOn: null }, { endsOn: { gte: localDate } }],
              },
            }),
            studentHasConflict(this.prisma, studentId, session),
            this.prisma.lessonSession.findFirst({
              where: {
                id: { not: session.id },
                teacherId: session.teacherId,
                status: 'SCHEDULED',
                startsAt: { lt: session.endsAt },
                endsAt: { gt: session.startsAt },
              },
              select: { id: true },
            }),
          ]);
        const capacity = session.capacity - occupiedEnrollments - bookedTrials;
        const conflict = Boolean(studentConflict || teacherConflict || capacity <= 0);
        return {
          id: session.id,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          teacher: session.teacher,
          course: session.classGroup.course,
          availableSeats: Math.max(0, capacity),
          unavailableReason: studentConflict
            ? 'Student has another class at this time'
            : teacherConflict
              ? 'Teacher is already teaching another class'
              : capacity <= 0
                ? 'Class is full'
                : null,
          bookable: !conflict,
        };
      }),
    );
    return { items };
  }

  async teacherToday(teacherId: string) {
    const start = melbourneDayStart();
    const end = melbourneNextDayStart(start);
    const localDate = new Date(`${melbourneDateKey(start)}T00:00:00.000Z`);
    const sessions = await this.prisma.lessonSession.findMany({
      where: { teacherId, startsAt: { gte: start, lt: end }, status: { not: 'CANCELLED' } },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        classGroup: {
          select: {
            code: true,
            course: { select: { id: true, name: true, subject: true } },
            enrollments: {
              where: {
                startsOn: { lte: localDate },
                OR: [{ endsOn: null }, { endsOn: { gte: localDate } }],
              },
              select: {
                student: { select: { id: true, firstName: true, lastName: true, yearLevel: true } },
              },
            },
          },
        },
        trials: {
          where: { status: { not: 'CANCELLED' } },
          select: {
            id: true,
            status: true,
            lead: {
              select: {
                student: { select: { id: true, firstName: true, lastName: true, yearLevel: true } },
              },
            },
          },
        },
      },
    });
    return sessions.map((session) => {
      const regular = session.classGroup.enrollments.map(({ student }) => ({
        ...student,
        isTrial: false,
      }));
      const trials = session.trials.map(({ lead }) => ({ ...lead.student, isTrial: true }));
      const roster = [
        ...new Map([...regular, ...trials].map((student) => [student.id, student])).values(),
      ];
      return {
        id: session.id,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        status: session.status,
        classGroup: { code: session.classGroup.code, course: session.classGroup.course },
        roster,
      };
    });
  }
}
