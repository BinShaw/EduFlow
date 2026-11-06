import {
  Prisma,
  PrismaClient,
  UserRole,
  LeadStage,
  SessionStatus,
  TrialStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { melbourneDateKey, melbourneLocalDateTimeToUtc } from '../src/common/timezone';

const prisma = new PrismaClient();
const firstNames = [
  'Mia',
  'Leo',
  'Ava',
  'Noah',
  'Isla',
  'Oliver',
  'Sophie',
  'Jack',
  'Grace',
  'Ethan',
];
const lastNames = [
  'Chen',
  'Nguyen',
  'Smith',
  'Wong',
  'Taylor',
  'Patel',
  'Brown',
  'Wilson',
  'Zhang',
  'Lee',
];

function atDay(offset: number, hour: number) {
  const date = new Date(`${melbourneDateKey(new Date())}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return melbourneLocalDateTimeToUtc(date.toISOString().slice(0, 10), hour, 0);
}

async function seed(db: Prisma.TransactionClient, passwordHash: string) {
  const admins: Array<{ id: string }> = [];
  const teachers: Array<{ id: string }> = [];
  for (let i = 1; i <= 10; i++)
    admins.push(
      await db.user.create({
        data: {
          email: `admin${i}@eduflow.local`,
          name: `Admin ${i}`,
          passwordHash,
          role: UserRole.ADMIN,
        },
      }),
    );
  for (let i = 1; i <= 4; i++)
    teachers.push(
      await db.user.create({
        data: {
          email: `teacher${i}@eduflow.local`,
          name: `Teacher ${i}`,
          passwordHash,
          role: UserRole.TEACHER,
        },
      }),
    );
  const courses = await Promise.all([
    db.course.create({
      data: { code: 'MATH-Y5', name: 'Year 5 Mathematics', subject: 'Mathematics' },
    }),
    db.course.create({ data: { code: 'ENG-Y6', name: 'Year 6 English', subject: 'English' } }),
    db.course.create({ data: { code: 'SCI-Y7', name: 'Year 7 Science', subject: 'Science' } }),
  ]);
  const todayWeekday = new Date(`${melbourneDateKey(new Date())}T00:00:00Z`).getUTCDay() || 7;
  const groups: Array<{ id: string; teacherId: string; weekday: number }> = [];
  for (let i = 0; i < 8; i++)
    groups.push(
      await db.classGroup.create({
        data: {
          code: `CLASS-${String(i + 1).padStart(2, '0')}`,
          courseId: courses[i % 3].id,
          teacherId: teachers[i % 4].id,
          weekday: ((todayWeekday - 1 + Math.floor(i / 4) * 2) % 7) + 1,
          localStartTime: i < 4 ? '09:00' : '11:00',
          durationMinutes: 60,
          capacity: 10,
        },
      }),
    );
  const sessions: Array<{ id: string; startsAt: Date; endsAt: Date; classGroupId: string }> = [];
  for (let offset = -7; offset <= 21; offset++) {
    for (let i = 0; i < 8; i++) {
      const startsAt = atDay(offset, i < 4 ? 9 : 11);
      const weekday = new Date(`${melbourneDateKey(startsAt)}T00:00:00Z`).getUTCDay() || 7;
      if (weekday !== groups[i].weekday) continue;
      sessions.push(
        await db.lessonSession.create({
          data: {
            seedKey: `session-${offset}-${i}`,
            classGroupId: groups[i].id,
            teacherId: groups[i].teacherId,
            startsAt,
            endsAt: new Date(startsAt.getTime() + 3600000),
            capacity: 10,
            status: SessionStatus.SCHEDULED,
          },
        }),
      );
    }
  }
  let lastGuardianId = '';
  const students: Array<{ id: string; ownerAdminId: string; leadId: string }> = [];
  for (let i = 0; i < 1000; i++) {
    // Siblings share a contact; every record is fictional.
    if (i % 2 === 0) {
      const guardian = await db.guardian.create({
        data: {
          name: `${lastNames[Math.floor(i / 10) % 10]} Parent ${Math.floor(i / 2) + 1}`,
          email: `family${Math.floor(i / 2) + 1}@example.test`,
          phone: `0400${String(i).padStart(6, '0')}`,
        },
      });
      lastGuardianId = guardian.id;
    }
    const ownerAdminId = admins[Math.floor(i / 100)].id;
    const student = await db.student.create({
      data: {
        demoKey: `student-${String(i + 1).padStart(4, '0')}`,
        firstName: `${firstNames[i % 10]}${i >= 10 ? ` ${Math.floor(i / 10)}` : ''}`,
        lastName: lastNames[Math.floor(i / 10) % 10],
        yearLevel: (i % 12) + 1,
        ownerAdminId,
        guardians: { create: { guardianId: lastGuardianId, isPrimary: true } },
        leads: {
          create: {
            createdById: ownerAdminId,
            source: ['Website', 'Phone', 'Referral'][i % 3],
            stage: i % 5 === 0 ? LeadStage.CONTACTED : LeadStage.NEW,
            notes: 'Interested in small-group learning.',
          },
        },
      },
      include: { leads: true },
    });
    students.push({ id: student.id, ownerAdminId, leadId: student.leads[0].id });
  }
  const future = sessions.filter((s) => s.startsAt > new Date());
  const past = sessions.filter((s) => s.endsAt < new Date());
  const bookedStudentIds = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const student = students[i < 20 ? i : (i * 17) % 1000];
    if (bookedStudentIds.has(student.id)) continue;
    bookedStudentIds.add(student.id);
    const session = i < 12 ? past[i % past.length] : future[i % future.length];
    const resolved = i < 6;
    const status = resolved
      ? i % 2 === 0
        ? TrialStatus.ATTENDED
        : TrialStatus.NO_SHOW
      : TrialStatus.BOOKED;
    await db.trialBooking.create({
      data: {
        leadId: student.leadId,
        lessonSessionId: session.id,
        createdById: student.ownerAdminId,
        status,
        notes: resolved ? 'Placement discussion needed after the trial.' : null,
      },
    });
    await db.lead.update({
      where: { id: student.leadId },
      data: { stage: resolved ? LeadStage.TRIAL_DONE : LeadStage.TRIAL_BOOKED },
    });
  }
  for (let i = 0; i < 120; i++) {
    const student = students[i < 30 ? i : (i * 7) % 1000];
    const dueAt = atDay((i % 11) - 4, 9);
    const completed = i % 9 === 0;
    await db.followUp.create({
      data: {
        studentId: student.id,
        leadId: student.leadId,
        createdById: student.ownerAdminId,
        action: [
          'Call parent after trial',
          'Confirm preferred class time',
          'Share placement options',
        ][i % 3],
        dueAt,
        status: completed ? 'COMPLETED' : 'OPEN',
        completedAt: completed ? new Date() : null,
      },
    });
    if (!completed)
      await db.lead.update({ where: { id: student.leadId }, data: { nextFollowUpAt: dueAt } });
  }
  for (let i = 0; i < 8; i++) {
    await db.enrollment.create({
      data: {
        studentId: students[900 + i].id,
        classGroupId: groups[i].id,
        startsOn: new Date(`${melbourneDateKey(new Date())}T00:00:00Z`),
      },
    });
  }
}

async function main() {
  if (process.env.ALLOW_DEMO_SEED !== 'true')
    throw new Error('Set ALLOW_DEMO_SEED=true explicitly. Seed is for an empty demo database.');
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 12)
    throw new Error(
      'Provide SEED_DEMO_PASSWORD (at least 12 characters) through external configuration.',
    );
  const count = await prisma.user.count();
  if (count) {
    const demoStudents = await prisma.student.count({ where: { demoKey: { not: null } } });
    if (
      demoStudents === 1000 &&
      (await prisma.user.findUnique({ where: { email: 'admin1@eduflow.local' } }))
    ) {
      console.log('Demo data already exists; no records or passwords were changed.');
      return;
    }
    throw new Error('Refusing to seed a non-empty database. Use a new disposable demo database.');
  }
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  await prisma.$transaction((tx) => seed(tx, passwordHash), { timeout: 180000 });
  console.log(
    'Seed complete: 10 admins x 100 students, 4 teachers, 8 weekly groups, sessions, trials and follow-ups.',
  );
  console.log(
    'Accounts: admin1@eduflow.local through admin10; teacher1@eduflow.local through teacher4. Password: external SEED_DEMO_PASSWORD.',
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Seed failed.');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
