import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../common/api.js';
import { getCookie } from '../../common/cookie.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Bell,
    CalendarDays,
    ChartNoAxesColumn,
    Clock3,
    FileText,
    HelpCircle,
    LayoutGrid,
    LibraryBig,
    LineChart,
    Plus,
    Search,
    Settings,
    Sigma,
    SquareCheckBig,
    UserCircle2,
    Zap,
} from 'lucide-react';

const SIDEBAR_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid, href: '/examPortal/viewExam', active: true },
    { key: 'exams', label: 'Exams', icon: FileText, href: '/examPortal/Exams' },
    { key: 'results', label: 'Results', icon: ChartNoAxesColumn, href: '/examPortal/viewResult' },
    // { key: 'analytics', label: 'Analytics', icon: LineChart, href: '/examPortal/viewResult' },
    // { key: 'library', label: 'Library', icon: LibraryBig, href: '/' },
];

const STATUS_META = {
    active: {
        label: 'available',
        icon: Zap,
        badgeClass: 'bg-cyan-500/20 text-cyan-200',
        actionLabel: 'Start Exam',
        actionClass: 'border border-cyan-300/70 bg-cyan-400 text-[#02203b] hover:bg-cyan-300',
        iconClass: 'bg-cyan-500/25 text-cyan-200',
    },
    upcoming: {
        label: 'upcoming',
        icon: Sigma,
        badgeClass: 'bg-slate-500/25 text-slate-200',
        actionLabel: 'View Details',
        actionClass: 'border border-slate-600/80 bg-transparent text-slate-100 hover:bg-slate-700/50',
        iconClass: 'bg-violet-500/25 text-violet-200',
    },
    completed: {
        label: 'completed',
        icon: SquareCheckBig,
        badgeClass: 'bg-emerald-500/20 text-emerald-200',
        actionLabel: 'View Results',
        actionClass: 'border border-slate-600/80 bg-transparent text-slate-100 hover:bg-slate-700/50',
        iconClass: 'bg-teal-500/25 text-teal-100',
    },
};

const getExamField = (exam = {}, keys = []) => {
    for (const key of keys) {
        const value = exam?.[key];
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }
    return undefined;
};

const getExamStatus = (exam = {}) => {
    const now = Date.now();
    const startValue = getExamField(exam, ['TestStartTime', 'test_start_time']);
    const endValue = getExamField(exam, ['TestEndTime', 'test_end_time']);
    const start = startValue ? new Date(startValue).getTime() : null;
    const end = endValue ? new Date(endValue).getTime() : null;
    if (typeof end === 'number' && end < now) return 'completed';
    if (typeof start === 'number' && start > now) return 'upcoming';
    return 'active';
};

const formatExamDate = (value) => {
    if (!value) return 'Date not scheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date not scheduled';
    return date.toLocaleString([], {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getScholarName = () => {
    const rawUser = getCookie('qs-user');
    if (!rawUser) return 'Scholar';

    try {
        const parsed = JSON.parse(rawUser);
        const candidate = parsed?.name || parsed?.fullName || parsed?.full_name || parsed?.username || parsed?.email;
        if (!candidate) return 'Scholar';
        return String(candidate).split('@')[0];
    } catch {
        return rawUser.split('@')[0] || 'Scholar';
    }
};

const MOCK_EXAMS = [
    {
        test_id: 'mock-1',
        test_name: 'Introduction to Quantum Physics',
        test_duration: 60,
        number_of_questions_per_test: 50,
        test_start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        test_end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        total_marks: 100,
    },
    {
        test_id: 'mock-2',
        test_name: 'Advanced Linear Algebra II',
        test_duration: 90,
        number_of_questions_per_test: 40,
        test_start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        total_marks: 100,
    },
    {
        test_id: 'mock-3',
        test_name: 'Relational Database Systems',
        test_duration: 75,
        number_of_questions_per_test: 45,
        test_start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        test_end_time: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        total_marks: 94,
    },
];

export default function ViewExam() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [exams, setExams] = useState(() => []);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [scholarName] = useState(() => getScholarName());

    useEffect(() => {
        const token = getCookie('qs-token');
        if (!token) {
            let counter = 3;
            setError(`No Authentication Redirecting in ${counter}...`);
            const timer = setInterval(() => {
                counter -= 1;
                if (counter <= 0) {
                    clearInterval(timer);
                    navigate('/login');
                } else {
                    setError(`No Authentication Redirecting in ${counter}...`);
                }
            }, 1000);
            return () => clearInterval(timer);
        }

        setLoading(true);
        apiGet('/api/test-portal/assigned-tests', { token })
            .then((res) => setExams(res?.data?.tests || res?.data?.data || []))
            .catch((err) => {
                setError('No Exams Found');
                console.error(err);
            })
            .finally(() => setLoading(false));
    }, [navigate]);

    const examData = useMemo(() => (exams.length ? exams : MOCK_EXAMS), [exams]);

    const decoratedExams = useMemo(() => examData.map((exam) => ({
        ...exam,
        status: getExamStatus(exam),
    })), [examData]);

    const filteredExams = useMemo(() => {
        if (selectedFilter === 'all') return decoratedExams;
        return decoratedExams.filter((exam) => exam.status === selectedFilter);
    }, [decoratedExams, selectedFilter]);

    const completedExams = useMemo(
        () => decoratedExams.filter((exam) => exam.status === 'completed'),
        [decoratedExams]
    );

    const upcomingCount = useMemo(
        () => decoratedExams.filter((exam) => exam.status === 'upcoming').length,
        [decoratedExams]
    );

    const avgScore = useMemo(() => {
        if (!completedExams.length) return null;
        const total = completedExams.reduce(
            (sum, exam) => sum + (Number(getExamField(exam, ['TotalMarks', 'total_marks'])) || 0),
            0
        );
        return Math.round(total / completedExams.length);
    }, [completedExams]);

    const totalCredits = useMemo(
        () => decoratedExams.reduce(
            (sum, exam) => sum + Math.max(1, Math.round((Number(getExamField(exam, ['TestDuration', 'test_duration'])) || 0) / 30)),
            0
        ),
        [decoratedExams]
    );

    const scholarLevel = Math.max(1, Math.min(9, Math.round(totalCredits / 3) || 1));

    const openExam = (exam) => {
        if (exam.status === 'completed') {
            navigate('/examPortal/viewResult', { state: { exam } });
            return;
        }
        navigate('/examPortal/startExam', { state: { exam } });
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#020b21] text-slate-100">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-24 top-12 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.22)_0%,rgba(56,189,248,0)_70%)]" />
                <div className="absolute right-0 top-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.2)_0%,rgba(37,99,235,0)_72%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.35)_0%,rgba(2,6,23,0.72)_100%)]" />
            </div>

            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1550px]">
                <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800/80 bg-[#091634]/85 backdrop-blur lg:flex">
                    <div className="border-b border-slate-800/80 px-5 py-6">
                        <div className="flex items-center gap-3">
                            <UserCircle2 className="size-10 text-cyan-300" />
                            <div>
                                <p className="text-sm font-semibold text-slate-100">{scholarName}</p>
                                <p className="text-xs text-slate-400">Level {scholarLevel} Scholar</p>
                            </div>
                        </div>
                    </div>

                    <nav className="px-4 py-5">
                        <div className="space-y-1">
                            {SIDEBAR_ITEMS.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => navigate(item.href)}
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${item.active
                                            ? 'bg-cyan-500/16 text-cyan-200'
                                            : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                                            }`}
                                    >
                                        <Icon className="size-4" />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>
                    <div className="mt-auto border-t border-slate-800/80 px-4 py-4">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-200"
                        >
                            <HelpCircle className="size-4" />
                            Support
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/settings')}
                            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-200"
                        >
                            <Settings className="size-4" />
                            Settings
                        </button>
                    </div>
                </aside>

                <div className="flex min-h-screen flex-1 flex-col">
                    <header className="border-b border-slate-800/80 px-4 py-4 md:px-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 lg:hidden">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate('/examPortal/viewResult')}
                                    className="h-8 rounded-full border-slate-700 bg-transparent px-3 text-xs text-slate-200 hover:bg-slate-800"
                                >
                                    Results
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate('/settings')}
                                    className="h-8 rounded-full border-slate-700 bg-transparent px-3 text-xs text-slate-200 hover:bg-slate-800"
                                >
                                    Settings
                                </Button>
                            </div>

                            <div className="ml-auto flex items-center gap-2">
                                <div className="relative hidden sm:block">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="search"
                                        placeholder="Search exams..."
                                        className="h-10 w-60 rounded-full border border-slate-700/80 bg-[#020a1f]/90 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/70 focus:outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    aria-label="Notifications"
                                    className="inline-flex size-9 items-center justify-center rounded-full border border-slate-700/80 bg-[#020a1f]/90 text-slate-300 transition hover:text-white"
                                >
                                    <Bell className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Help"
                                    className="inline-flex size-9 items-center justify-center rounded-full border border-slate-700/80 bg-[#020a1f]/90 text-slate-300 transition hover:text-white"
                                >
                                    <HelpCircle className="size-4" />
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
                        <section>
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-100 md:text-5xl">Intellectual Dashboard</h1>
                            <p className="mt-2 text-sm text-slate-400 md:text-base">Focus is the gateway to mastery. Welcome back, Scholar.</p>

                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-cyan-200">Upcoming {upcomingCount}</span>
                                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-200">Completed {completedExams.length}</span>
                            </div>
                        </section>

                        <section className="mt-8">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h2 className="text-2xl font-semibold tracking-tight text-slate-100">My Exams</h2>
                                <div className="flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/50 p-1">
                                    {[
                                        { key: 'all', label: 'All' },
                                        { key: 'active', label: 'Active' },
                                        { key: 'completed', label: 'Completed' },
                                    ].map((filter) => (
                                        <button
                                            key={filter.key}
                                            type="button"
                                            onClick={() => setSelectedFilter(filter.key)}
                                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${selectedFilter === filter.key
                                                ? 'bg-cyan-500/22 text-cyan-200'
                                                : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && <p className="mb-3 rounded-lg border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</p>}
                            {loading && <p className="mb-3 text-sm text-slate-400">Loading exams...</p>}

                            {!loading && filteredExams.length === 0 && (
                                <p className="mb-4 rounded-lg border border-slate-700 bg-slate-900/55 px-3 py-2 text-sm text-slate-300">
                                    No exams are available in this category right now.
                                </p>
                            )}

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {filteredExams.map((exam, index) => {
                                    const isCompleted = exam.status === 'completed';
                                    const examName = getExamField(exam, ['TestName', 'test_name']) || 'Untitled Exam';
                                    const examStartTime = getExamField(exam, ['TestStartTime', 'test_start_time']);
                                    const examDuration = Number(getExamField(exam, ['TestDuration', 'test_duration'])) || 0;
                                    const questionCount = Number(getExamField(exam, [
                                        'NumberOfQuestionsPerTest',
                                        'number_of_questions_per_test',
                                        'NumberOfQuestions',
                                        'number_of_questions',
                                    ])) || 0;
                                    const totalMarks = Number(getExamField(exam, ['TotalMarks', 'total_marks'])) || 0;
                                    const examId = getExamField(exam, ['TestID', 'test_id']);
                                    const statusMeta = STATUS_META[exam.status] || STATUS_META.active;
                                    const Icon = statusMeta.icon;
                                    const spotlightClass = index % 2 === 0
                                        ? 'shadow-[0_26px_50px_-34px_rgba(34,211,238,0.9)]'
                                        : 'shadow-[0_26px_50px_-34px_rgba(99,102,241,0.72)]';

                                    return (
                                        <Card
                                            key={examId || `${examName}-${index}`}
                                            className={`border border-slate-700/70 bg-[linear-gradient(145deg,rgba(24,36,70,0.95),rgba(12,22,45,0.96))] p-0 py-0 ${spotlightClass}`}
                                        >
                                            <CardContent className="flex h-full flex-col p-5 text-slate-300">
                                                <div className="mb-4 flex items-start justify-between">
                                                    <div className={`inline-flex size-9 items-center justify-center rounded-lg ${statusMeta.iconClass}`}>
                                                        <Icon className="size-4" />
                                                    </div>
                                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${statusMeta.badgeClass}`}>
                                                        {statusMeta.label}
                                                    </span>
                                                </div>

                                                <h3 className="min-h-16 text-[1.75rem] leading-tight font-semibold tracking-tight text-slate-100 md:text-2xl">{examName}</h3>

                                                <div className="mt-4 space-y-2 text-sm text-slate-300">
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <CalendarDays className="size-4 text-slate-400" />
                                                        {formatExamDate(examStartTime)}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <Clock3 className="size-4 text-slate-400" />
                                                        {examDuration > 0 ? `${examDuration} Minutes` : 'Duration TBD'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <FileText className="size-4 text-slate-400" />
                                                        {questionCount > 0 ? `${questionCount} Questions` : 'Questions TBD'}
                                                    </div>
                                                    {isCompleted && (
                                                        <div className="flex items-center gap-2 font-medium text-emerald-300">
                                                            <SquareCheckBig className="size-4" />
                                                            Grade: {totalMarks}%
                                                        </div>
                                                    )}
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant={exam.status === 'active' ? 'default' : 'outline'}
                                                    onClick={() => openExam(exam)}
                                                    className={`mt-6 h-10 w-full rounded-full text-sm font-semibold ${statusMeta.actionClass}`}
                                                >
                                                    {statusMeta.actionLabel}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}

                                <Card className="border border-dashed border-slate-700 bg-slate-900/35 p-0 py-0">
                                    <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center text-slate-400">
                                        <Plus className="size-6 text-slate-500" />
                                        <div>
                                            <p className="font-medium text-slate-300">Register for New Exam</p>
                                            <p className="mt-1 text-xs">Discover fresh challenges and sharpen your mastery.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </section>
                    </main>

                    <footer className="border-t border-slate-800/80 px-4 py-4 md:px-8">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
                            <span className="font-semibold tracking-wide text-slate-200">QuantumScholar</span>
                            <button type="button" onClick={() => navigate('/')} className="transition hover:text-slate-200">Privacy Policy</button>
                            <button type="button" onClick={() => navigate('/')} className="transition hover:text-slate-200">Terms of Service</button>
                            <button type="button" onClick={() => navigate('/')} className="transition hover:text-slate-200">Support</button>
                            <button type="button" onClick={() => navigate('/')} className="transition hover:text-slate-200">Contact</button>
                            <span className="sm:ml-auto">© 2026 QuantumScholar. All rights reserved.</span>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}
