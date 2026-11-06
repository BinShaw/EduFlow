import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'en-AU' | 'zh-CN';
const STORAGE_KEY = 'eduflow.language';

const zh: Record<string, string> = {
  Workspace: '工作区',
  'Today’s classes': '今日课程',
  Overview: '概览',
  Students: '学生',
  'Follow-ups': '跟进事项',
  Teacher: '教师',
  'Education advisor': '课程顾问',
  'Sign out': '退出登录',
  'Open navigation': '打开导航',
  'Close navigation': '关闭导航',
  Melbourne: '墨尔本时间',
  'All times Australia/Melbourne': '所有时间均为澳大利亚/墨尔本时间',
  'A little clarity, every day.': '让每一天的工作都清晰一些。',
  'Your next conversation could be the start of something great.':
    '下一次沟通，可能就是美好学习旅程的开始。',
  Retry: '重试',
  'Loading your workspace…': '正在加载工作区…',
  'Your workspace': '我的工作区',
  'Admin workspace': '管理员工作区',
  'Good morning': '早上好',
  'A clear view of the next conversations and classes.': '清晰查看接下来的沟通和课程安排。',
  'Here’s what needs your attention today.': '以下是今天需要关注的事项。',
  'Dashboard scope': '工作台范围',
  'My students': '我的学生',
  'All students': '全部学生',
  'New inquiry': '新建咨询',
  'Add first inquiry': '添加首条咨询',
  'Across your team': '团队总数',
  'Currently assigned': '当前分配给你',
  'Overdue follow-ups': '逾期跟进',
  'Need a response': '需要及时回复',
  'Due today': '今日待办',
  'Your daily queue': '你的每日待办',
  'Upcoming trials': '即将开始的试听',
  'on record': '条记录',
  'Next seven days': '未来七天',
  'Your next step starts here': '从这里开启下一步',
  "Create an inquiry to begin tracking a student's journey from first contact to first class.":
    '创建一条咨询记录，开始追踪学生从首次联系到首次上课的进度。',
  'Needs attention': '需要关注',
  'Follow-ups waiting for a response': '等待回复的跟进事项',
  'Assigned advisor': '负责顾问',
  Overdue: '已逾期',
  'No overdue follow-ups. Nice work.': '没有逾期跟进，做得很好。',
  'Today’s follow-ups': '今日跟进',
  'Planned conversations for today': '今天计划进行的沟通',
  'No follow-ups are scheduled for today.': '今天没有安排跟进事项。',
  'The next seven days': '未来七天',
  View: '查看',
  'No trials scheduled this week.': '本周没有安排试听。',
  'Recently completed': '近期已完成',
  'The latest trial outcomes': '最近的试听结果',
  'No trial outcomes yet.': '还没有试听结果。',
  'Student directory': '学生名录',
  'Every inquiry, every relationship, all in one place.': '集中管理每一条咨询和每一段家校关系。',
  'Search students or parents': '搜索学生或家长',
  'Search student or parent…': '搜索学生或家长…',
  Student: '学生',
  'Parent / guardian': '家长 / 监护人',
  Stage: '阶段',
  'Next follow-up': '下次跟进',
  Advisor: '负责顾问',
  'Open profile': '打开档案',
  'Year not specified': '未填写年级',
  'No contact': '暂无联系人',
  'No matching students': '没有找到匹配的学生',
  'No students here yet': '这里还没有学生',
  'Try another student name or a parent’s name.': '请尝试其他学生姓名或家长姓名。',
  'Create an inquiry to start a student’s learning journey.': '新建咨询，开启学生的学习旅程。',
  'Previous page': '上一页',
  'Next page': '下一页',
  'Back to students': '返回学生列表',
  'Edit profile': '编辑档案',
  'Trial already booked': '已预约试听',
  'Arrange trial': '安排试听',
  'Trial lessons': '试听课程',
  'Cancel trial': '取消试听',
  'Record result': '登记结果',
  'Ready for a first class?': '准备好开始第一堂课了吗？',
  'Arrange a trial lesson to find the right learning environment.':
    '安排一次试听，帮助学生找到合适的学习环境。',
  'Follow-up timeline': '跟进记录',
  'Reviewed message draft': '已审核的消息草稿',
  'Complete follow-up': '完成跟进',
  'Record a trial outcome to schedule the next conversation.':
    '登记试听结果后，即可安排下一次沟通。',
  'Parents & guardians': '家长与监护人',
  'Primary contact': '主要联系人',
  'Inquiry details': '咨询详情',
  Source: '来源',
  Created: '创建时间',
  Unknown: '未知',
  'Not scheduled': '未安排',
  'Edit student profile': '编辑学生档案',
  'First name': '名',
  'Last name': '姓',
  'Year level': '年级',
  Cancel: '取消',
  'Save changes': '保存更改',
  'Conversations that count': '每次沟通都很重要',
  'Keep the next step clear and the conversation moving.': '明确下一步，让沟通持续推进。',
  'To do': '待办',
  Completed: '已完成',
  Complete: '完成',
  'All caught up': '已全部处理',
  'No completed follow-ups': '暂无已完成的跟进',
  'Your scheduled follow-ups will appear here when a trial outcome is recorded.':
    '登记试听结果并安排跟进后，事项会显示在这里。',
  'Complete a follow-up and your notes will be kept here.': '完成跟进后，记录会保存在这里。',
  'What happened?': '沟通结果',
  'Record the outcome of your conversation…': '记录本次沟通结果…',
  'Mark complete': '标记为已完成',
  'Teacher workspace': '教师工作区',
  'Your teaching day, at a glance': '一览今天的教学安排',
  'Class roster': '课程名单',
  'New · Trial': '新试听',
  'No students on this session’s roster.': '本节课程暂无学生。',
  'A clear day ahead': '今天暂无课程',
  'You have no classes scheduled for today. Your classes and trial students will appear here on teaching days.':
    '今天没有安排课程。教学日的课程和试听学生会显示在这里。',
  'Welcome back': '欢迎回来',
  'Sign in to continue where you left off.': '登录以继续使用工作区。',
  'Your student workspace': '学生管理工作区',
  'Email address': '邮箱地址',
  Password: '密码',
  'Sign in': '登录',
  'Need an account? Contact your workspace administrator.': '需要账号？请联系工作区管理员。',
  'A better way to move learning forward': '让学习进程更清晰',
  'Every student.': '关注每一位学生。',
  'A clear next step.': '明确每一个下一步。',
  'From the first conversation to their first class. Keep your students, trials and follow-ups connected.':
    '从首次沟通到第一堂课，将学生、试听和跟进紧密连接。',
  'Designed around your teaching day': '围绕教学日常设计',
  'One workspace for advisors and teachers': '为顾问和教师提供统一工作区',
  'Austin Education · Student management': '澳升教育 · 学生管理',
  'Trial booked': '已预约试听',
  'Trial completed': '试听已完成',
  Enrolled: '已报名',
  Closed: '已关闭',
  Booked: '已预约',
  Attended: '已到课',
  'No show': '未到课',
  Cancelled: '已取消',
  Open: '待处理',
  Active: '活跃',
  Prospect: '潜在学生',
  Inactive: '非活跃',
  Contacted: '已联系',
  'AI drafting is not configured. Continue with the manual form.':
    'AI 草稿功能尚未配置，请继续使用手动表单。',
  'AI drafting is temporarily unavailable or returned an invalid result. Continue with the manual form.':
    'AI 草稿暂不可用或返回内容无效，请继续使用手动表单。',
  'Please wait before requesting another AI draft.': '请求 AI 草稿过于频繁，请稍后再试。',
  'Email or password is incorrect.': '邮箱或密码不正确。',
  'Too many sign-in attempts. Please wait a minute.': '登录尝试次数过多，请稍等一分钟。',
  'Class is full.': '课程名额已满。',
  'Student has another booking at this time.': '该学生在此时段已有其他预约。',
  'Teacher has another class at this time.': '该教师在此时段已有其他课程。',
  'Use application/json for write requests.': '写入请求必须使用 application/json。',
  Page: '页',
  of: '/',
  'Close dialog': '关闭对话框',
  'New student inquiry': '新建学生咨询',
  'Start with the student and their primary contact.': '先填写学生和主要联系人的信息。',
  'School year': '年级',
  'Inquiry source': '咨询来源',
  'Primary parent / guardian': '主要家长 / 监护人',
  'Contact name': '联系人姓名',
  'Email (optional)': '邮箱（选填）',
  'Phone (optional)': '电话（选填）',
  'Inquiry notes (optional)': '咨询备注（选填）',
  'What is the family looking for?': '家庭目前有哪些学习需求？',
  "This inquiry will be assigned to you. You can arrange a trial from the student's profile.":
    '该咨询将分配给你。你可以在学生档案中安排试听。',
  'Create inquiry': '创建咨询',
  'places available': '个名额可用',
  'No sessions available': '暂无可选课程',
  'There are no scheduled classes in the next 21 days. Ask your administrator to add sessions, then retry.':
    '未来 21 天没有已排课程。请联系管理员添加课程后重试。',
  'Choose a class in the next 21 days. Availability is checked again when you book.':
    '请选择未来 21 天内的课程。提交预约时系统会再次检查名额。',
  'Confirm trial': '确认试听',
  'Times in Australia/Melbourne': '时间均为澳大利亚/墨尔本时间',
  'Record trial outcome': '登记试听结果',
  'You can record a result once this session has ended.': '课程结束后才能登记试听结果。',
  Attendance: '出席情况',
  'Did not attend': '未到课',
  'Trial feedback': '试听反馈',
  'What went well? What should we follow up on? Avoid personal details in AI feedback.':
    '哪些方面进展顺利？后续需要跟进什么？请勿在 AI 反馈中填写个人信息。',
  'A little help with the next step': '为下一步提供一些建议',
  'Generate a draft, review it, then make it yours.': '生成草稿后请先审核，再按需修改。',
  Draft: '生成草稿',
  'Draft summary: ': '草稿摘要：',
  'Next action': '下一步行动',
  'Follow-up date (Melbourne)': '跟进日期（墨尔本）',
  'Scheduled for 9:00 am Melbourne time.': '将安排在墨尔本时间上午 9:00。',
  'Parent message draft (optional)': '家长消息草稿（选填）',
  'Write a message manually or edit the generated draft…': '手动编写消息或修改生成的草稿…',
  'Saving records your draft. It does not send a message.': '保存后仅记录草稿，不会发送消息。',
  'Save result & follow-up': '保存结果和跟进',
  'This releases the place. You can arrange another trial afterwards.':
    '取消后会释放课程名额，你可以之后重新安排试听。',
  'Reason for cancellation': '取消原因',
  'Keep trial': '保留试听',
  'Call parent after trial': '试听后联系家长',
  'Call parent': '联系家长',
  'Share class options': '发送课程选项',
  'Arrange a placement check': '安排分班测评',
  'Close inquiry': '关闭咨询',
  'This student is assigned to {{name}}. You can view this profile; their advisor manages changes.':
    '该学生由 {{name}} 负责。你可以查看档案，档案修改由负责顾问处理。',
  'Please sign in.': '请先登录。',
  'Session expired. Please sign in again.': '登录状态已过期，请重新登录。',
  'You do not have permission to perform this action.': '你没有权限执行此操作。',
  'Inquiry not found.': '未找到该咨询记录。',
  'You may only schedule students assigned to you.': '你只能为分配给自己的学生安排试听。',
  'Class session not found.': '未找到该课程时段。',
  'This class or teacher is not available for booking.': '该课程或教师当前不可预约。',
  'This class session can no longer be booked.': '该课程时段已无法预约。',
  'This inquiry already has an active trial.': '该咨询已有进行中的试听预约。',
  'The student has another class at this time.': '该学生在此时段已有其他课程。',
  'The teacher is already assigned to an overlapping class.': '该教师已被安排了时间重叠的课程。',
  'This class is full.': '该课程名额已满。',
  'Trial booking not found.': '未找到该试听预约。',
  'You may only change students assigned to you.': '你只能修改分配给自己的学生。',
  'Only an active booking can be cancelled.': '只有有效预约可以取消。',
  'This trial has already been resolved.': '该试听已完成处理。',
  'Record the result after the trial session has ended.': '试听结束后才能登记结果。',
  'Follow-up date is invalid.': '跟进日期无效。',
  'Choose today or a future follow-up date.': '请选择今天或未来的跟进日期。',
  'Follow-up not found.': '未找到该跟进事项。',
  'You may only complete follow-ups for your students.': '你只能完成自己负责学生的跟进事项。',
  'This follow-up is already closed.': '该跟进事项已关闭。',
  'This follow-up has changed. Refresh and try again.': '该跟进事项已发生变化，请刷新后重试。',
  'Student not found.': '未找到该学生。',
  'You may only edit students assigned to you.': '你只能编辑分配给自己的学生。',
  'Use the teacher schedule endpoint.': '请使用教师课程接口。',
  'Invalid idempotency key.': '幂等请求标识无效。',
  'Choose a student first.': '请先选择学生。',
  'You may only prepare drafts for students assigned to you.': '你只能为分配给自己的学生准备草稿。',
  'Student ownership has changed. Refresh the profile.': '学生负责人已变更，请刷新档案。',
  'An unexpected error occurred. Please retry.': '发生意外错误，请重试。',
  'Origin not allowed': '请求来源不受允许。',
  Website: '网站',
  Phone: '电话',
  Referral: '转介绍',
  'Walk-in': '到店咨询',
  Other: '其他',
};

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en-AU' || saved === 'zh-CN') return saved;
  } catch {
    // Storage may be unavailable in a restricted browser context.
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-AU';
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (text: string) => string;
};
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Keep the in-memory preference for this session.
    }
  };
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (text) =>
        locale === 'zh-CN' ? zh[text] || interpolate(text, locale) : interpolate(text, locale),
    }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function interpolate(text: string, locale: Locale) {
  if (locale === 'zh-CN' && text.startsWith('Good morning, ')) return `早上好，${text.slice(14)}`;
  if (locale === 'zh-CN' && text.startsWith('Year ')) return `${text.slice(5)}年级`;
  if (locale === 'zh-CN' && /^[\d,]+ students$/.test(text)) return `${text.split(' ')[0]} 名学生`;
  if (locale === 'zh-CN' && text.startsWith('Website')) return '网站';
  if (locale === 'zh-CN' && text === 'Phone') return '电话';
  if (locale === 'zh-CN' && text === 'Referral') return '转介绍';
  if (locale === 'zh-CN' && text === 'Walk-in') return '到店咨询';
  if (locale === 'zh-CN' && text === 'Other') return '其他';
  return text;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside LocaleProvider');
  return context;
}

export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  return (
    <div
      aria-label="Language"
      className={`inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5 text-xs ${className}`}
    >
      <button
        type="button"
        lang="en-AU"
        aria-pressed={locale === 'en-AU'}
        onClick={() => setLocale('en-AU')}
        className={`rounded px-2.5 py-1.5 ${locale === 'en-AU' ? 'bg-emerald-50 font-semibold text-brand' : 'text-slate-500 hover:bg-slate-50'}`}
      >
        English
      </button>
      <button
        type="button"
        lang="zh-CN"
        aria-pressed={locale === 'zh-CN'}
        onClick={() => setLocale('zh-CN')}
        className={`rounded px-2.5 py-1.5 ${locale === 'zh-CN' ? 'bg-emerald-50 font-semibold text-brand' : 'text-slate-500 hover:bg-slate-50'}`}
      >
        中文
      </button>
    </div>
  );
}
