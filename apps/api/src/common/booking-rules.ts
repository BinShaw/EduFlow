import { Prisma } from '@prisma/client';
import { melbourneDateKey } from './timezone';

export async function studentHasConflict(
  db: Prisma.TransactionClient,
  studentId: string,
  session: { id: string; startsAt: Date; endsAt: Date; classGroupId: string },
) {
  const overlap = {
    status: 'SCHEDULED' as const,
    startsAt: { lt: session.endsAt },
    endsAt: { gt: session.startsAt },
  };
  // DATE columns represent the Melbourne calendar date, encoded as UTC midnight for Prisma.
  const localDate = new Date(`${melbourneDateKey(session.startsAt)}T00:00:00.000Z`);
  const trial = await db.trialBooking.findFirst({
    where: { status: 'BOOKED', lead: { studentId }, lessonSession: overlap },
    select: { id: true },
  });
  if (trial) return true;
  const attendance = await db.attendance.findFirst({
    where: { studentId, lessonSession: overlap },
    select: { id: true },
  });
  if (attendance) return true;
  const enrollment = await db.enrollment.findFirst({
    where: {
      studentId,
      startsOn: { lte: localDate },
      OR: [{ endsOn: null }, { endsOn: { gte: localDate } }],
      classGroup: { sessions: { some: overlap } },
    },
    select: { id: true },
  });
  return Boolean(enrollment);
}
