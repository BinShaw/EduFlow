import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomBytes, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/prisma.service';
import { melbourneDateKey, melbourneDayStart } from '../../src/common/timezone';

describe('Real PostgreSQL + HTTP workflow', () => {
  let app: INestApplication;
  let db: PrismaService;
  let ownerId: string;
  let otherId: string;
  let teacherId: string;
  let ownerCookie: string;
  let otherCookie: string;
  let teacherCookie: string;
  let courseId: string;
  let sequence = 0;
  const suffix = randomUUID().slice(0, 8);
  const password = randomBytes(20).toString('hex');
  const json = (cookie: string) => request(app.getHttpServer());

  beforeAll(async () => {
    if (process.env.ALLOW_INTEGRATION_TESTS !== 'true' || process.env.NODE_ENV === 'production') {
      throw new Error(
        'Use a disposable database and set ALLOW_INTEGRATION_TESTS=true outside the repository.',
      );
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    db = app.get(PrismaService);
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const owner = await db.user.create({
      data: {
        email: `test-owner-${suffix}@example.test`,
        name: 'Test owner',
        role: 'ADMIN',
        passwordHash,
      },
    });
    const other = await db.user.create({
      data: {
        email: `test-other-${suffix}@example.test`,
        name: 'Test other',
        role: 'ADMIN',
        passwordHash,
      },
    });
    const teacher = await db.user.create({
      data: {
        email: `test-teacher-${suffix}@example.test`,
        name: 'Test teacher',
        role: 'TEACHER',
        passwordHash,
      },
    });
    ownerId = owner.id;
    otherId = other.id;
    teacherId = teacher.id;
    for (const [user, assign] of [
      [owner, (cookie: string) => (ownerCookie = cookie)],
      [other, (cookie: string) => (otherCookie = cookie)],
      [teacher, (cookie: string) => (teacherCookie = cookie)],
    ] as const) {
      const result = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: user.email, password })
        .expect(201);
      const cookie = result.headers['set-cookie'][0];
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(result.body.user).not.toHaveProperty('passwordHash');
      assign(cookie);
    }
    courseId = (
      await db.course.create({
        data: { code: `TEST-${suffix}`, name: 'Test course', subject: 'Mathematics' },
      })
    ).id;
  });
  afterAll(async () => {
    await app?.close();
  });

  async function student(owner = ownerId) {
    const item = await db.student.create({
      data: {
        firstName: `Test ${++sequence}`,
        lastName: suffix,
        ownerAdminId: owner,
        leads: { create: { createdById: owner } },
      },
      include: { leads: true },
    });
    return { ...item, leadId: item.leads[0].id };
  }
  async function session(
    capacity = 10,
    startsAt = new Date(Date.now() + 2 * 86400000),
    teacher = '',
  ) {
    const selectedTeacher =
      teacher ||
      (
        await db.user.create({
          data: {
            email: `teacher-${randomUUID()}@example.test`,
            name: 'Fixture teacher',
            role: 'TEACHER',
            passwordHash: 'not-a-login-account',
          },
        })
      ).id;
    const group = await db.classGroup.create({
      data: {
        code: `TEST-${randomUUID()}`,
        courseId,
        teacherId: selectedTeacher,
        weekday: 1,
        localStartTime: '09:00',
        durationMinutes: 60,
        capacity,
      },
    });
    return db.lessonSession.create({
      data: {
        classGroupId: group.id,
        teacherId: selectedTeacher,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3600000),
        capacity,
      },
    });
  }
  const book = (cookie: string, leadId: string, lessonSessionId: string) =>
    json(cookie).post('/api/trials').set('Cookie', cookie).send({ leadId, lessonSessionId });

  it('rejects unauthenticated access and cross-origin writes', async () => {
    await request(app.getHttpServer()).get('/api/students').expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Origin', 'https://untrusted.example')
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .type('form')
      .send('x=1')
      .expect(415);
  });
  it('allows Admin to view other students while enforcing edit ownership', async () => {
    const item = await student(otherId);
    await json(ownerCookie)
      .get(`/api/students/${item.id}`)
      .set('Cookie', ownerCookie)
      .expect(200)
      .expect((res) => expect(res.body.canEdit).toBe(false));
    await json(ownerCookie)
      .patch(`/api/students/${item.id}`)
      .set('Cookie', ownerCookie)
      .send({ firstName: 'Changed' })
      .expect(403);
    const slot = await session();
    await book(ownerCookie, item.leadId, slot.id).expect(403);
    await json(teacherCookie).get('/api/students').set('Cookie', teacherCookie).expect(403);
    await json(teacherCookie).get('/api/follow-ups').set('Cookie', teacherCookie).expect(403);
  });
  it('validates nested input, trims names, and rejects injected ownership', async () => {
    await json(ownerCookie)
      .post('/api/students')
      .set('Cookie', ownerCookie)
      .send({ firstName: 'A', lastName: 'B' })
      .expect(400);
    await json(ownerCookie)
      .post('/api/students')
      .set('Cookie', ownerCookie)
      .send({ firstName: '   ', lastName: 'B', guardian: { name: 'Parent' } })
      .expect(400);
    await json(ownerCookie)
      .post('/api/students')
      .set('Cookie', ownerCookie)
      .send({ firstName: 'A', lastName: 'B', ownerAdminId: otherId, guardian: { name: 'Parent' } })
      .expect(400);
    await json(ownerCookie).get('/api/students/not-a-uuid').set('Cookie', ownerCookie).expect(400);
  });
  it('replays a student creation request without duplicate students or contacts', async () => {
    const key = randomUUID();
    const input = { firstName: ' Test ', lastName: suffix, guardian: { name: ' Parent ' } };
    const first = await json(ownerCookie)
      .post('/api/students')
      .set('Cookie', ownerCookie)
      .set('Idempotency-Key', key)
      .send(input)
      .expect(201);
    const again = await json(ownerCookie)
      .post('/api/students')
      .set('Cookie', ownerCookie)
      .set('Idempotency-Key', key)
      .send(input)
      .expect(201);
    expect(again.body.id).toBe(first.body.id);
    expect(first.body.firstName).toBe('Test');
    expect(
      await db.auditLog.count({ where: { resourceId: first.body.id, action: 'STUDENT_CREATED' } }),
    ).toBe(1);
  });
  it('rejects duplicate booking, releases capacity on cancellation, and permits rebooking the same session', async () => {
    const item = await student();
    const slot = await session(1);
    const first = await book(ownerCookie, item.leadId, slot.id).expect(201);
    await book(ownerCookie, item.leadId, slot.id).expect(409);
    await json(otherCookie)
      .post(`/api/trials/${first.body.id}/cancel`)
      .set('Cookie', otherCookie)
      .send({ reason: 'Cannot attend' })
      .expect(403);
    await json(ownerCookie)
      .post(`/api/trials/${first.body.id}/cancel`)
      .set('Cookie', ownerCookie)
      .send({ reason: 'Cannot attend' })
      .expect(201);
    await book(ownerCookie, item.leadId, slot.id).expect(201);
    expect(await db.trialBooking.count({ where: { leadId: item.leadId, status: 'BOOKED' } })).toBe(
      1,
    );
  });
  it('does not oversell the final seat under concurrent HTTP requests', async () => {
    const a = await student();
    const b = await student();
    const slot = await session(1);
    const result = await Promise.all([
      book(ownerCookie, a.leadId, slot.id),
      book(ownerCookie, b.leadId, slot.id),
    ]);
    expect(result.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      await db.trialBooking.count({ where: { lessonSessionId: slot.id, status: 'BOOKED' } }),
    ).toBe(1);
  });
  it('rejects overlapping student trials across different inquiries', async () => {
    const item = await student();
    const first = await session();
    const other = await session(10, first.startsAt);
    await book(ownerCookie, item.leadId, first.id).expect(201);
    const lead = await db.lead.create({ data: { studentId: item.id, createdById: ownerId } });
    await book(ownerCookie, lead.id, other.id).expect(409);
  });
  it('checks formal enrollments in both availability and booking', async () => {
    const item = await student();
    const formal = await session();
    const trial = await session(10, formal.startsAt);
    await db.enrollment.create({
      data: {
        studentId: item.id,
        classGroupId: formal.classGroupId,
        startsOn: new Date(`${melbourneDateKey(formal.startsAt)}T00:00:00Z`),
      },
    });
    const available = await json(ownerCookie)
      .get(`/api/schedule/available?studentId=${item.id}`)
      .set('Cookie', ownerCookie)
      .expect(200);
    expect(available.body.items.find((s: any) => s.id === trial.id)?.bookable).toBe(false);
    await book(ownerCookie, item.leadId, trial.id).expect(409);
  });
  it('enforces teacher overlap in PostgreSQL using half-open intervals', async () => {
    const slot = await session();
    await expect(
      db.lessonSession.create({
        data: {
          classGroupId: slot.classGroupId,
          teacherId: slot.teacherId,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          capacity: 10,
        },
      }),
    ).rejects.toBeDefined();
    await expect(
      db.lessonSession.create({
        data: {
          classGroupId: slot.classGroupId,
          teacherId: slot.teacherId,
          startsAt: slot.endsAt,
          endsAt: new Date(slot.endsAt.getTime() + 3600000),
          capacity: 10,
        },
      }),
    ).resolves.toBeDefined();
  });
  it('rejects booking a past session and recording an unfinished session', async () => {
    const item = await student();
    const old = await session(10, new Date(Date.now() - 3 * 3600000));
    await book(ownerCookie, item.leadId, old.id).expect(409);
    const future = await session();
    const booking = await book(ownerCookie, item.leadId, future.id).expect(201);
    await json(ownerCookie)
      .post(`/api/trials/${booking.body.id}/outcome`)
      .set('Cookie', ownerCookie)
      .send({
        status: 'ATTENDED',
        nextFollowUpAt: melbourneDateKey(new Date()),
        followUpAction: 'Call parent',
      })
      .expect(409);
  });
  it('atomically records the result and reviewed draft once, and remains usable without AI configuration', async () => {
    const item = await student();
    const slot = await session(10, new Date(Date.now() - 3 * 3600000));
    const trial = await db.trialBooking.create({
      data: { leadId: item.leadId, lessonSessionId: slot.id, createdById: ownerId },
    });
    const oldKey = process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    await json(ownerCookie)
      .post('/api/ai/follow-up-draft')
      .set('Cookie', ownerCookie)
      .send({ trialBookingId: trial.id, notes: 'Needs placement discussion.' })
      .expect(503);
    if (oldKey) process.env.DEEPSEEK_API_KEY = oldKey;
    const input = {
      status: 'ATTENDED',
      notes: 'Good participation',
      nextFollowUpAt: melbourneDateKey(new Date()),
      followUpAction: 'Call parent',
      messageDraft: 'Reviewed draft for parent.',
    };
    await json(ownerCookie)
      .post(`/api/trials/${trial.id}/outcome`)
      .set('Cookie', ownerCookie)
      .send(input)
      .expect(201);
    await json(ownerCookie)
      .post(`/api/trials/${trial.id}/outcome`)
      .set('Cookie', ownerCookie)
      .send(input)
      .expect(409);
    const tasks = await db.followUp.findMany({ where: { trialBookingId: trial.id } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].messageDraft).toBe(input.messageDraft);
    expect(melbourneDateKey(tasks[0].dueAt)).toBe(input.nextFollowUpAt);
    const result = await Promise.all(
      [1, 2].map(() =>
        json(ownerCookie)
          .patch(`/api/follow-ups/${tasks[0].id}/complete`)
          .set('Cookie', ownerCookie)
          .send({ completionNote: 'Parent contacted.' }),
      ),
    );
    expect(result.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await db.auditLog.count({
        where: { resourceId: tasks[0].id, action: 'FOLLOW_UP_COMPLETED' },
      }),
    ).toBe(1);
  });
  it('shows only the teacher’s roster and excludes contact and advisor notes', async () => {
    const item = await student();
    const start = melbourneDayStart();
    start.setUTCHours(start.getUTCHours() + 12);
    const slot = await session(10, start, teacherId);
    await db.trialBooking.create({
      data: {
        leadId: item.leadId,
        lessonSessionId: slot.id,
        createdById: ownerId,
        notes: 'Advisor-only notes',
      },
    });
    const response = await json(teacherCookie)
      .get('/api/schedule/teacher/today')
      .set('Cookie', teacherCookie)
      .expect(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(slot.id);
    expect(response.body[0].roster).toContainEqual(
      expect.objectContaining({ id: item.id, isTrial: true }),
    );
    expect(JSON.stringify(response.body)).not.toMatch(
      /passwordHash|guardian|ownerAdminId|Advisor-only/,
    );
    await json(ownerCookie)
      .get('/api/schedule/teacher/today')
      .set('Cookie', ownerCookie)
      .expect(403);
  });
});
