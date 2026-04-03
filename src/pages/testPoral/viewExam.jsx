import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../common/api.js';
import { getCookie } from '../../common/cookie.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    CalendarDays,
    ChartNoAxesColumn,
    CircleUserRound,
    ClipboardList,
    Clock3,
    FileText,
    GraduationCap,
    Plus,
    Sigma,
    SquareCheckBig,
    Zap,
} from 'lucide-react';
import Navbar from '../../components/exam/navbar.jsx';


const getExamStatus = (exam = {}) => {
    const now = Date.now();
    const start = exam?.test_start_time ? new Date(exam.test_start_time).getTime() : null;
    const end = exam?.test_end_time ? new Date(exam.test_end_time).getTime() : null;

    if (typeof end === 'number' && end < now) return 'completed';
    if (typeof start === 'number' && start > now) return 'upcoming';
    return 'active';
};

const formatExamDate = (value) => {
    if (!value) return 'Date not scheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date not scheduled';
    return date.toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const MOCK_EXAMS = [
    {
        test_id: 'mock-1',
        test_name: 'Introduction to Quantum Physics',
        test_duration: 120,
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
            .then(res => setExams(res.data.tests || []))
            .catch(err => {
                setError('No Exams Found');
                console.error(err);
            })
            .finally(() => setLoading(false));
    }, [navigate]);

    const examData = exams.length ? exams : MOCK_EXAMS;
    const decoratedExams = examData.map((exam) => ({
        ...exam,
        status: getExamStatus(exam),
    }));
    const filteredExams = selectedFilter === 'all'
        ? decoratedExams
        : decoratedExams.filter((exam) => exam.status === selectedFilter);
    const upcomingCount = decoratedExams.filter((exam) => exam.status === 'upcoming').length;
    const completedExams = decoratedExams.filter((exam) => exam.status === 'completed');
    const avgScore = completedExams.length
        ? Math.round(completedExams.reduce((sum, exam) => sum + (Number(exam.total_marks) || 0), 0) / completedExams.length)
        : 88;
    const totalCredits = decoratedExams.reduce((sum, exam) => sum + Math.max(0, Math.round((Number(exam.test_duration) || 0) / 3)), 0);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#020b21] dark:text-slate-100">
            <Navbar />
            <div className="min-vh-100 d-flex flex-column" style={{ background: 'linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 85%, #000) 100%)', color: 'var(--text)' }}>
                <main className="flex-1 px-4 py-8 md:px-8">
                    <section className="mb-6">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">Intellectual Dashboard</h1>
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 md:text-base">Focus is the gateway to mastery. Welcome back, Scholar.</p>
                    </section>

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <section>
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">My Exams</h2>
                                <div className="flex items-center gap-2 rounded-full p-1 ring-1 ring-slate-700/60">
                                    {[
                                        { key: 'all', label: 'All' },
                                        { key: 'active', label: 'Active' },
                                        { key: 'completed', label: 'Completed' },
                                    ].map((filter) => (
                                        <button
                                            key={filter.key}
                                            type="button"
                                            onClick={() => setSelectedFilter(filter.key)}
                                            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${selectedFilter === filter.key ? 'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-200 dark:ring-cyan-400/60' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
                            {loading && <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">Loading exams...</p>}

                            <div className="grid gap-4 md:grid-cols-2">
                                {filteredExams.map((exam, index) => {
                                    const isCompleted = exam.status === 'completed';
                                    const isUpcoming = exam.status === 'upcoming';
                                    const iconTone = index % 2 === 0
                                        ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300'
                                        : 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300';

                                    return (
                                        <Card key={exam.TestID || `${exam.TestName}-${index}`} className="border border-slate-900/60 bg-slate-100/70 dark:bg-slate-900/30 p-0 ">
                                            <CardContent className="flex h-full flex-col p-5 text-slate-600 dark:text-slate-400">
                                                <div className="mb-4 flex items-start justify-between">
                                                    <div className={`inline-flex size-9 items-center justify-center rounded-lg ${iconTone}`}>
                                                        {isCompleted ? <SquareCheckBig className="size-4" /> : index % 2 === 0 ? <Zap className="size-4" /> : <Sigma className="size-4" />}
                                                    </div>
                                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${isCompleted ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300' : isUpcoming ? 'bg-slate-200 text-slate-700 dark:bg-slate-700/70 dark:text-slate-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'}`}>
                                                        {exam.status}
                                                    </span>
                                                </div>
                                                <h3 className="min-h-12 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{exam.TestName || 'Untitled Exam'}</h3>

                                                <div className="mt-4 space-y-2 text-sm text-slate-800 dark:text-slate-300">
                                                    <div className="flex items-center gap-2"><CalendarDays className="size-4 text-slate-500 " />{formatExamDate(exam.TestStartTime)} to {formatExamDate(exam.TestEndTime)}</div>
                                                    <div className="flex items-center gap-2"><Clock3 className="size-4 text-slate-500" />{exam.TestDuration || 0} Minutes</div>
                                                    <div className="flex items-center gap-2"><FileText className="size-4 text-slate-500" />Attempts: {exam.AttemptsRemaining || 0} / {exam.AttemptsAlloted || 0}</div>
                                                    {isCompleted && <div className="flex items-center gap-2 font-medium text-emerald-300"><GraduationCap className="size-4" />Grade: {exam.TotalMarks || 0}%</div>}
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => navigate('/examPortal/viewExam')}
                                                    className={`mt-6 w-full rounded-full border-slate-600/70 font-semibold ${isCompleted ? 'bg-slate-900/80 text-white hover:bg-slate-700' : 'bg-cyan-400 text-white hover:bg-gray-400' }`}												>
                                                    {isCompleted ? 'View Results' : isUpcoming ? 'View Details' : 'Start Exam'}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}

                                <Card className="border border-dashed border-slate-300 bg-slate-100/70 p-0 dark:border-slate-700/80 dark:bg-slate-900/30">
                                    <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center text-slate-600 dark:text-slate-400">
                                        <Plus className="size-6" />
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-slate-300">Register for New Exam</p>
                                            <p className="mt-1 text-xs">Discover fresh challenges and sharpen your mastery.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </section>

                        <aside className="space-y-4">
                            <Card className="border border-slate-700/70 bg-slate-900/75 p-0">
                                <CardContent className="space-y-4 p-5">
                                    <h3 className="text-lg font-semibold text-slate-100">Quick Summary</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center justify-between rounded-xl bg-slate-800/70 p-3"><span className="inline-flex items-center gap-2 text-slate-300"><CalendarDays className="size-4 text-cyan-300" />Upcoming Exams</span><strong className="text-lg text-slate-100">{upcomingCount}</strong></div>
                                        <div className="flex items-center justify-between rounded-xl bg-slate-800/70 p-3"><span className="inline-flex items-center gap-2 text-slate-300"><ChartNoAxesColumn className="size-4 text-violet-300" />Average Score</span><strong className="text-lg text-violet-300">{avgScore}%</strong></div>
                                        <div className="flex items-center justify-between rounded-xl bg-slate-800/70 p-3"><span className="inline-flex items-center gap-2 text-slate-300"><FileText className="size-4 text-emerald-300" />Total Credits</span><strong className="text-lg text-emerald-300">{totalCredits}</strong></div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-700/70 bg-slate-900/75 p-0">
                                <CardContent className="p-5">
                                    <h3 className="mb-4 text-lg font-semibold text-slate-100">Study Insights</h3>
                                    <div className="flex h-24 items-end gap-2">
                                        {[30, 45, 70, 38, 56, 78].map((height, index) => (
                                            <div key={height + index} className="flex-1 rounded-t bg-gradient-to-t from-cyan-600/70 to-cyan-300/80" style={{ height: `${height}%` }} />
                                        ))}
                                    </div>
                                    <p className="mt-3 text-xs text-slate-400">Your preparation activity is 15% higher this week.</p>
                                </CardContent>
                            </Card>

                            <Card className="overflow-hidden border border-slate-700/70 p-0">
                                <CardContent className="bg-[linear-gradient(120deg,#0f2947_0%,#0e6f8f_45%,#041a35_100%)] p-5">
                                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-cyan-200">New Resources</p>
                                    <p className="mt-2 text-sm text-slate-100">Quantum Field Theory lecture notes updated.</p>
                                </CardContent>
                            </Card>
                        </aside>
                    </div>
                </main>
            </div>
        </div>
    );
}

