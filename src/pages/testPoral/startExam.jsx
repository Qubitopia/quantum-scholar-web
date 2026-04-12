import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft,
    AudioLines,
    Camera,
    CircleCheckBig,
    Clock3,
    Network,
    ShieldCheck,
    Sparkles,
    Zap,
} from 'lucide-react';


const START_RULES = [
    'Ensure a stable internet connection before starting. Loss of connection may result in automatic submission.',
    'Strict adherence to the "No switching tabs" policy. External navigation will be flagged and reported.',
    'Camera and microphone must remain active throughout the session for proctoring purposes.',
    'You have one attempt for this final. Ensure you are in a quiet, distraction-free environment.',
];

const FOOTER_LINKS = [
    { label: 'Privacy Policy', href: '/PrivacyPolicy.md' },
    { label: 'Terms of Service', href: '/TermsAndConditions.md' },
    { label: 'Support Center', href: '/#support' },
    { label: 'Documentation', href: '/README.md' },
];

const getFirstDefinedValue = (source, keys) => {
    for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }
    return undefined;
};

const toPositiveNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const formatExamTime = (value) => {
    if (!value) return 'To be announced';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'To be announced';
    return date.toLocaleString([], {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};


export default function StartExam() {
    const navigate = useNavigate();
    const { state } = useLocation();
    console.log('Received state in StartExam:', state.exam);
    const exam = state?.exam;

    const readinessItems = useMemo(() => ([
        { label: 'Camera Access', icon: Camera, state: 'Ready' },
        { label: 'Audio Hardware', icon: AudioLines, state: 'Ready' },
        { label: 'Network Latency', icon: Network, state: 'Optimum' },
    ]), []);

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-900 dark:bg-[#010814] dark:text-slate-100">
            <div className="pointer-events-none absolute inset-0 -z-0">
                <div className="absolute -left-16 bottom-0 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.28)_0%,rgba(56,189,248,0)_68%)] blur-sm dark:bg-[radial-gradient(circle,rgba(129,140,248,0.36)_0%,rgba(129,140,248,0)_70%)]" />
                <div className="absolute right-0 top-0 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.25)_0%,rgba(56,189,248,0)_72%)] dark:bg-[radial-gradient(circle,rgba(103,232,249,0.26)_0%,rgba(103,232,249,0)_72%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.35),rgba(15,23,42,0))]" />
            </div>

            <div className="relative z-10 flex min-h-screen flex-col">
                <main className="flex flex-1 items-center justify-center px-6 py-20">
                    <section className="w-full max-w-[1280px]">
                        <button
                            type="button"
                            onClick={() => navigate('/examPortal/viewExam')}
                            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                        >
                            <ArrowLeft className="size-4" /> Go Back
                        </button>

                        <div className="flex items-center justify-center">
                            <div className="grid w-full items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                                <Card className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white/85 shadow-[0_24px_60px_-26px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-700/40 dark:bg-[#0c1632]/95 dark:shadow-[0_30px_100px_-34px_rgba(56,189,248,0.6)]">
                                    <CardContent className="p-7 md:p-8">
                                        <p className="text-xs font-semibold tracking-[0.2em] text-cyan-700 uppercase dark:text-cyan-300">Exam Confirmation</p>
                                        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">{exam.title}</h1>

                                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                                                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase dark:text-slate-400">Duration</p>
                                                <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100"><Clock3 className="size-4 text-cyan-600 dark:text-cyan-300" />{exam.TestDuration} Minutes</p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                                                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase dark:text-slate-400">Total Marks</p>
                                                <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100"><Sparkles className="size-4 text-indigo-600 dark:text-indigo-300" />{state.exam.TotalMarks}</p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                                                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase dark:text-slate-400">Pass Grade</p>
                                                <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100"><ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-300" />{exam.passGrade || 30}%</p>
                                            </div>
                                        </div>

                                        <Separator className="my-6 bg-slate-200 dark:bg-slate-700/70" />

                                        <div>
                                            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Instructions & Integrity Rules</h2>
                                            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                                                {START_RULES.map((rule) => (
                                                    <li key={rule} className="flex items-start gap-3">
                                                        <span className="mt-2 size-2 shrink-0 rounded-full bg-cyan-500 dark:bg-cyan-300" />
                                                        <span>{rule}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300">
                                            Scheduled Window: <strong className="font-semibold text-slate-900 dark:text-slate-100">{formatExamTime(exam.TestStartTime)}</strong> to <strong className="font-semibold text-slate-900 dark:text-slate-100">{formatExamTime(exam.TestEndTime)}</strong>
                                        </div>
                                    </CardContent>
                                </Card>

                                <aside className="space-y-5">
                                    <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-[0_18px_50px_-34px_rgba(2,6,23,0.7)] backdrop-blur dark:border-slate-700/50 dark:bg-[#091530]/94 dark:shadow-none">
                                        <CardContent className="p-5">
                                            <h3 className="mb-4 text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100">System Readiness</h3>
                                            <div className="space-y-3 text-sm">
                                                {readinessItems.map(({ label, icon: Icon, state: readiness }) => (
                                                    <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-900/55">
                                                        <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                            <Icon className="size-4 text-cyan-600 dark:text-cyan-300" />{label}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                            <CircleCheckBig className="size-3" />{readiness}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-950 shadow-[0_20px_45px_-26px_rgba(8,47,73,0.95)]">
                                        <CardContent className="p-4">
                                            <div className="mb-4 h-28 rounded-xl bg-[radial-gradient(circle_at_center,rgba(103,232,249,0.75)_0%,rgba(56,189,248,0.25)_24%,rgba(15,23,42,0.72)_52%,rgba(2,6,23,1)_100%)]" />
                                            <p className="text-[11px] font-semibold tracking-[0.14em] text-cyan-300 uppercase">Subject Code</p>
                                            <p className="mt-1 text-sm font-medium text-slate-100 flex items-center gap-2">
                                                <span className="px-2 py-0.5 text-xs rounded-md bg-slate-700 text-slate-200">
                                                    #{state.exam.TestID}
                                                </span>
                                                <span>{state.exam.TestName}</span>
                                            </p>                                            <br />
                                            <p className="mt-1 text-sm font-medium text-slate-100">Attempt: {state.exam.AttemptsAlloted} / {state.exam.AttemptsRemaining}</p>
                                        </CardContent>
                                    </Card>

                                    <Button
                                        type="button"
                                        onClick={() => navigate('/examPortal/viewExam')}
                                        className="h-14 w-full rounded-full border border-cyan-300/70 bg-cyan-400 text-lg font-semibold text-slate-900 shadow-[0_14px_34px_-20px_rgba(34,211,238,0.95)] hover:bg-cyan-300"
                                    >
                                        Begin Examination <Zap className="size-5" />
                                    </Button>

                                    <p className="text-center text-[11px] font-medium tracking-wide text-slate-600 dark:text-slate-400">
                                        By proceeding, you agree to the examination integrity terms.
                                    </p>
                                </aside>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="border-t border-slate-200/80  text-slate-300 dark:border-slate-700/70 dark:bg-[#080E1D]">
                    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-12 md:py-12">
                        <nav className="flex flex-wrap items-center gap-4 text-[11px] font-medium tracking-[0.14em] uppercase text-slate-400">
                            {FOOTER_LINKS.map((link) => (
                                <a key={link.label} href={link.href} className="transition text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-300">
                                    {link.label}
                                </a>
                            ))}
                        </nav>
                        <p className="text-[11px] tracking-[0.14em] text-slate-700 uppercase dark:text-slate-300">
                            © {new Date().getFullYear()} Quantum Core Intellect. All rights reserved.
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}
