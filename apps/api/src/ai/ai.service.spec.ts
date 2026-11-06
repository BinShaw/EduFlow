import { randomBytes } from 'node:crypto';
import OpenAI from 'openai';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma.service';

jest.mock('openai', () => ({ __esModule: true, default: jest.fn() }));
const create = jest.fn();

describe('AI follow-up drafting', () => {
  const booking = {
    id: 'trial',
    status: 'BOOKED',
    lead: {
      studentId: 'student',
      student: {
        ownerAdminId: 'owner',
        firstName: 'Mia',
        lastName: 'Chen',
        guardians: [{ guardian: { name: 'Alice Chen' } }],
      },
    },
    lessonSession: { classGroup: { course: { name: 'Mathematics' } } },
  };
  let service: AiService;
  let db: { trialBooking: { findUnique: jest.Mock }; student: { findUnique: jest.Mock } };
  const oldKey = process.env.DEEPSEEK_API_KEY;
  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = randomBytes(24).toString('hex');
    create.mockReset();
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create } },
    }));
    db = {
      trialBooking: { findUnique: jest.fn().mockResolvedValue(booking) },
      student: { findUnique: jest.fn().mockResolvedValue({ ownerAdminId: 'owner' }) },
    };
    service = new AiService(db as unknown as PrismaService);
  });
  afterAll(() => {
    if (oldKey) process.env.DEEPSEEK_API_KEY = oldKey;
    else delete process.env.DEEPSEEK_API_KEY;
  });
  const valid = {
    summary: 'Needs a placement discussion.',
    nextAction: 'CALL_PARENT',
    messageDraft: 'Hello, would you like to discuss the next steps?',
  };
  const response = (content: unknown) => ({
    model: 'mock',
    choices: [{ message: { content: JSON.stringify(content) } }],
  });

  it('rejects another advisor before contacting the provider', async () => {
    await expect(service.followUpDraft('other', 'trial', 'feedback')).rejects.toMatchObject({
      status: 403,
    });
    expect(create).not.toHaveBeenCalled();
  });
  it('redacts names and contacts, uses JSON mode, caps tokens, and validates the response', async () => {
    create.mockResolvedValue(response(valid));
    await expect(
      service.followUpDraft(
        'owner',
        'trial',
        'Mia Chen and Alice Chen: call alice@example.test on +61 400 123 456. Placement check needed.',
      ),
    ).resolves.toMatchObject({ nextActionLabel: 'Call parent' });
    const request = create.mock.calls[0][0];
    expect(request).toMatchObject({ response_format: { type: 'json_object' }, max_tokens: 700 });
    expect(request.messages[1].content).not.toMatch(/Mia|Chen|Alice|alice@example|400 123/);
    expect(db.student.findUnique).toHaveBeenCalled();
  });
  it.each([
    { ...valid, nextAction: 'SEND_EMAIL' },
    { ...valid, unexpected: true },
    { ...valid, messageDraft: 'a'.repeat(1201) },
    {},
  ])('offers manual fallback for schema-invalid output %#', async (content) => {
    create.mockResolvedValue(response(content));
    await expect(service.followUpDraft('owner', 'trial', 'feedback')).rejects.toMatchObject({
      status: 503,
    });
  });
  it('offers manual fallback on provider timeout and malformed JSON', async () => {
    create.mockRejectedValueOnce(new Error('timeout'));
    await expect(service.followUpDraft('owner', 'trial', 'feedback')).rejects.toMatchObject({
      status: 503,
    });
    create.mockResolvedValueOnce({ choices: [{ message: { content: '<not-json>' } }] });
    await expect(service.followUpDraft('owner', 'trial', 'feedback')).rejects.toMatchObject({
      status: 503,
    });
  });
  it('does not call a provider without an externally supplied key', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    await expect(service.followUpDraft('owner', 'trial', 'feedback')).rejects.toMatchObject({
      status: 503,
    });
    expect(create).not.toHaveBeenCalled();
  });
  it('enforces six attempts per minute', async () => {
    create.mockResolvedValue(response(valid));
    for (let i = 0; i < 6; i++) await service.followUpDraft('owner', 'trial', 'feedback');
    await expect(service.followUpDraft('owner', 'trial', 'feedback')).rejects.toMatchObject({
      status: 429,
    });
    expect(create).toHaveBeenCalledTimes(6);
  });
  it('rejects a result if ownership changed while the provider was running', async () => {
    create.mockResolvedValue(response(valid));
    db.student.findUnique.mockResolvedValue({ ownerAdminId: 'new-owner' });
    await expect(service.followUpDraft('owner', 'trial', 'feedback')).rejects.toMatchObject({
      status: 403,
    });
  });
});
