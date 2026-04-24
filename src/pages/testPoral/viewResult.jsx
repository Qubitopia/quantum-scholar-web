import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../common/api.js';
import { getCookie } from '../../common/cookie.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	CalendarDays,
	ChartNoAxesColumn,
	ChevronRight,
	Filter,
	Loader2,
	Medal,
	Search,
	SlidersHorizontal,
	SortDesc,
	Sparkles,
	Trophy,
} from 'lucide-react';

const FILTER_OPTIONS = [
	{ value: 'all', label: 'All Results' },
	{ value: 'attempted', label: 'Attempted' },
	{ value: 'excellent', label: 'Excellent (>= 85%)' },
	{ value: 'review', label: 'Need Review (< 70%)' },
];

const SORT_OPTIONS = [
	{ value: 'recent', label: 'Most Recent' },
	{ value: 'score-desc', label: 'Highest Score' },
	{ value: 'score-asc', label: 'Lowest Score' },
	{ value: 'name', label: 'Exam Name' },
];

const PAGE_SIZE = 4;

const getField = (source = {}, keys = []) => {
	for (const key of keys) {
		const value = source?.[key];
		if (value !== undefined && value !== null && value !== '') {
			return value;
		}
	}
	return undefined;
};

const toNumber = (value, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const parseJsonSafe = (value, fallback = null) => {
	if (value === undefined || value === null || value === '') return fallback;
	if (typeof value === 'object') return value;
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
};

const formatDate = (value) => {
	if (!value) return 'Date unavailable';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Date unavailable';
	return date.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' });
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

const inferTotalMarksFromQuestionJson = (questionJson) => {
	const parsed = parseJsonSafe(questionJson, {});
	const sections = Array.isArray(parsed?.sections) ? parsed.sections : [];

	const total = sections.reduce((sectionSum, section) => {
		const questions = Array.isArray(section?.questions) ? section.questions : [];
		const sectionMarks = questions.reduce((questionSum, question) => {
			const marks = toNumber(getField(question, ['successMarks', 'success_marks', 'marks', 'maxMarks']), 0);
			return questionSum + Math.max(0, marks);
		}, 0);
		return sectionSum + sectionMarks;
	}, 0);

	return total > 0 ? total : 0;
};

const pickBestAttempt = (attempts = []) => attempts.reduce((best, current) => {
	if (!best) return current;

	const bestMarks = toNumber(getField(best, ['achieved_marks', 'achievedMarks']), -Infinity);
	const currentMarks = toNumber(getField(current, ['achieved_marks', 'achievedMarks']), -Infinity);

	if (currentMarks > bestMarks) return current;
	if (currentMarks < bestMarks) return best;

	const bestTime = new Date(getField(best, ['start_time', 'startTime']) || 0).getTime();
	const currentTime = new Date(getField(current, ['start_time', 'startTime']) || 0).getTime();
	return currentTime > bestTime ? current : best;
}, null);

const getPerformanceState = (percentage, hasAttempt) => {
	if (!hasAttempt) return 'pending';
	if (percentage >= 85) return 'excellent';
	if (percentage >= 70) return 'solid';
	return 'review';
};

const getChipClass = (state) => {
	if (state === 'excellent') return 'bg-emerald-500/20 text-emerald-200';
	if (state === 'solid') return 'bg-cyan-500/20 text-cyan-200';
	if (state === 'review') return 'bg-rose-500/20 text-rose-200';
	return 'bg-slate-600/45 text-slate-200';
};

const getProgressClass = (state) => {
	if (state === 'excellent') return 'bg-emerald-400';
	if (state === 'solid') return 'bg-cyan-400';
	if (state === 'review') return 'bg-rose-400';
	return 'bg-slate-500';
};

const getScoreClass = (state) => {
	if (state === 'excellent') return 'text-emerald-300';
	if (state === 'solid') return 'text-cyan-300';
	if (state === 'review') return 'text-rose-300';
	return 'text-slate-300';
};

const buildResultItem = (test, attempts = [], index = 0) => {
	const testId = getField(test, ['TestID', 'test_id', 'id']);
	const testName = getField(test, ['TestName', 'test_name', 'title']) || `Exam ${index + 1}`;
	const totalMarks = Math.max(
		0,
		toNumber(getField(test, ['TotalMarks', 'total_marks']), 0)
	);

	const bestAttempt = pickBestAttempt(attempts);
	const hasAttempt = Boolean(bestAttempt);

	const fallbackMarks = hasAttempt ? inferTotalMarksFromQuestionJson(getField(bestAttempt, ['question_json', 'questionJson'])) : 0;
	const maxMarks = totalMarks || fallbackMarks;

	const achievedMarks = hasAttempt
		? Math.max(0, toNumber(getField(bestAttempt, ['achieved_marks', 'achievedMarks']), 0))
		: 0;

	const percentage = maxMarks > 0
		? Math.round((achievedMarks / maxMarks) * 1000) / 10
		: 0;

	const questionMeta = parseJsonSafe(getField(bestAttempt || {}, ['question_json', 'questionJson']), {});

	const examDate = getField(bestAttempt || {}, ['start_time', 'startTime'])
		|| getField(test, ['TestEndTime', 'test_end_time'])
		|| getField(test, ['TestStartTime', 'test_start_time']);

	const durationMinutes = toNumber(
		getField(test, ['TestDuration', 'test_duration']) || getField(bestAttempt || {}, ['duration']),
		0
	);

	const status = getPerformanceState(percentage, hasAttempt);
	const credits = Math.max(2, Math.round(durationMinutes / 10) || 2);

	return {
		id: String(testId || `result-${index}`),
		test,
		testId,
		testName,
		attempts,
		bestAttempt,
		hasAttempt,
		achievedMarks,
		totalMarks: maxMarks,
		percentage,
		status,
		credits,
		timestamp: examDate ? new Date(examDate).getTime() : 0,
		examDate,
		attemptCount: attempts.length,
		subtitle: getField(questionMeta, ['title']) || `Best attempt score from ${attempts.length || 0} attempt(s).`,
		topicTag: testName.split(' ').slice(0, 2).join(' '),
	};
};

export default function ViewResult() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [results, setResults] = useState([]);
	const [selectedFilter, setSelectedFilter] = useState('all');
	const [selectedSort, setSelectedSort] = useState('recent');
	const [searchQuery, setSearchQuery] = useState('');
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
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

		const loadResults = async () => {
			try {
				setLoading(true);
				setError('');

				const assignedResponse = await apiGet('/api/test-portal/assigned-tests', { token });
				const assignedTests = assignedResponse?.data?.tests || assignedResponse?.data?.data || [];

				const scoreRequests = assignedTests.map(async (test, index) => {
					const testId = getField(test, ['TestID', 'test_id', 'id']);
					if (!testId) return buildResultItem(test, [], index);

					try {
						const scoreResponse = await apiGet(`/api/test-portal/score/${encodeURIComponent(testId)}`, { token });
						const attempts = scoreResponse?.data?.attempts || scoreResponse?.data?.data || [];
						return buildResultItem(test, attempts, index);
					} catch (scoreError) {
						console.error(`Unable to load score for test ${testId}`, scoreError);
						return buildResultItem(test, [], index);
					}
				});

				const scoreResults = await Promise.all(scoreRequests);
				setResults(scoreResults.filter(Boolean));
			} catch (loadError) {
				console.error(loadError);
				setError('Unable to load exam results right now.');
			} finally {
				setLoading(false);
			}
		};

		void loadResults();
	}, [navigate]);

	useEffect(() => {
		setVisibleCount(PAGE_SIZE);
	}, [selectedFilter, selectedSort, searchQuery]);

	const attemptedResults = useMemo(
		() => results.filter((item) => item.hasAttempt),
		[results]
	);

	const averageScore = useMemo(() => {
		if (!attemptedResults.length) return 0;
		const total = attemptedResults.reduce((sum, item) => sum + item.percentage, 0);
		return Math.round((total / attemptedResults.length) * 10) / 10;
	}, [attemptedResults]);

	const previousScore = useMemo(() => {
		if (attemptedResults.length < 2) return null;
		const ordered = [...attemptedResults].sort((a, b) => b.timestamp - a.timestamp);
		return ordered[1]?.percentage ?? null;
	}, [attemptedResults]);

	const scoreDelta = useMemo(() => {
		if (previousScore === null) return null;
		return Math.round((averageScore - previousScore) * 10) / 10;
	}, [averageScore, previousScore]);

	const totalCredits = useMemo(
		() => attemptedResults.reduce((sum, item) => sum + item.credits, 0),
		[attemptedResults]
	);

	const cohortText = useMemo(() => {
		if (averageScore >= 85) return 'Top 15% of cohort';
		if (averageScore >= 70) return 'Top 35% of cohort';
		if (averageScore > 0) return 'Room to climb in cohort';
		return 'No scored attempts yet';
	}, [averageScore]);

	const filteredAndSortedResults = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();

		let nextResults = [...results];

		if (selectedFilter === 'attempted') {
			nextResults = nextResults.filter((item) => item.hasAttempt);
		}

		if (selectedFilter === 'excellent') {
			nextResults = nextResults.filter((item) => item.hasAttempt && item.percentage >= 85);
		}

		if (selectedFilter === 'review') {
			nextResults = nextResults.filter((item) => item.hasAttempt && item.percentage < 70);
		}

		if (query) {
			nextResults = nextResults.filter((item) => (
				item.testName.toLowerCase().includes(query)
				|| item.topicTag.toLowerCase().includes(query)
			));
		}

		if (selectedSort === 'recent') {
			nextResults.sort((a, b) => b.timestamp - a.timestamp);
		}

		if (selectedSort === 'score-desc') {
			nextResults.sort((a, b) => b.percentage - a.percentage);
		}

		if (selectedSort === 'score-asc') {
			nextResults.sort((a, b) => a.percentage - b.percentage);
		}

		if (selectedSort === 'name') {
			nextResults.sort((a, b) => a.testName.localeCompare(b.testName));
		}

		return nextResults;
	}, [results, searchQuery, selectedFilter, selectedSort]);

	const visibleResults = useMemo(
		() => filteredAndSortedResults.slice(0, visibleCount),
		[filteredAndSortedResults, visibleCount]
	);

	const canLoadMore = visibleCount < filteredAndSortedResults.length;

	return (
		<div className="relative min-h-screen overflow-hidden bg-[#020b21] text-slate-100">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -left-20 top-20 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.2)_0%,rgba(56,189,248,0)_72%)]" />
				<div className="absolute right-0 top-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18)_0%,rgba(37,99,235,0)_74%)]" />
				<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.35)_0%,rgba(2,6,23,0.76)_100%)]" />
			</div>

			<main className="relative z-10 mx-auto w-full max-w-[1300px] px-4 py-10 md:px-6">
				<header>
					<p className="text-sm font-semibold tracking-[0.12em] text-cyan-300 uppercase">{scholarName}</p>
					<h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-100 md:text-5xl">Performance Record</h1>
					<p className="mt-2 text-sm text-slate-400 md:text-base">Comprehensive history of your academic evaluations.</p>
				</header>

				<section className="mt-8 grid gap-4 md:grid-cols-3">
					<Card className="border border-slate-700/70 bg-[linear-gradient(145deg,rgba(20,33,64,0.95),rgba(11,22,45,0.98))] py-0 shadow-[0_20px_50px_-35px_rgba(34,211,238,0.8)]">
						<CardContent className="p-5">
							<p className="text-xs tracking-[0.13em] text-slate-400 uppercase">Average Score</p>
							<p className="mt-2 text-4xl font-semibold text-cyan-200">{averageScore.toFixed(1)}<span className="ml-1 text-base">%</span></p>
							<p className="mt-3 text-xs text-cyan-300">
								{scoreDelta === null ? 'Need 2 attempts for trend' : `${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(1)}% vs previous`}
							</p>
						</CardContent>
					</Card>

					<Card className="border border-slate-700/70 bg-[linear-gradient(145deg,rgba(20,33,64,0.95),rgba(11,22,45,0.98))] py-0 shadow-[0_20px_50px_-35px_rgba(99,102,241,0.8)]">
						<CardContent className="p-5">
							<p className="text-xs tracking-[0.13em] text-slate-400 uppercase">Exams Completed</p>
							<p className="mt-2 text-4xl font-semibold text-slate-100">{attemptedResults.length}</p>
							<p className="mt-3 flex items-center gap-1 text-xs text-slate-300">
								<ChartNoAxesColumn className="size-3.5" />
								Across {results.length} assigned exam(s)
							</p>
						</CardContent>
					</Card>

					<Card className="border border-slate-700/70 bg-[linear-gradient(145deg,rgba(20,33,64,0.95),rgba(11,22,45,0.98))] py-0 shadow-[0_20px_50px_-35px_rgba(16,185,129,0.7)]">
						<CardContent className="p-5">
							<p className="text-xs tracking-[0.13em] text-slate-400 uppercase">Total Credits Earned</p>
							<p className="mt-2 text-4xl font-semibold text-emerald-200">{totalCredits}<span className="ml-1 text-base">CR</span></p>
							<p className="mt-3 flex items-center gap-1 text-xs text-slate-300">
								<Trophy className="size-3.5" />
								{cohortText}
							</p>
						</CardContent>
					</Card>
				</section>

				<section className="mt-10">
					<div className="flex flex-wrap items-end justify-between gap-3">
						<h2 className="text-2xl font-semibold text-slate-100">Recent Results</h2>

						<div className="flex flex-wrap items-center gap-2">
							<div className="relative">
								<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
								<input
									type="search"
									value={searchQuery}
									onChange={(event) => setSearchQuery(event.target.value)}
									placeholder="Search by exam name"
									className="h-10 w-52 rounded-full border border-slate-700/80 bg-[#020a1f]/90 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/70 focus:outline-none"
								/>
							</div>

							<div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-[#091632]/80 px-3 py-2">
								<Filter className="size-4 text-slate-400" />
								<select
									value={selectedFilter}
									onChange={(event) => setSelectedFilter(event.target.value)}
									className="bg-transparent text-xs font-medium text-slate-200 outline-none"
								>
									{FILTER_OPTIONS.map((option) => (
										<option key={option.value} value={option.value} className="bg-slate-900 text-slate-100">
											{option.label}
										</option>
									))}
								</select>
							</div>

							<div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-[#091632]/80 px-3 py-2">
								<SortDesc className="size-4 text-slate-400" />
								<select
									value={selectedSort}
									onChange={(event) => setSelectedSort(event.target.value)}
									className="bg-transparent text-xs font-medium text-slate-200 outline-none"
								>
									{SORT_OPTIONS.map((option) => (
										<option key={option.value} value={option.value} className="bg-slate-900 text-slate-100">
											{option.label}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					{error && <p className="mt-4 rounded-lg border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</p>}

					{loading && (
						<div className="mt-6 flex items-center gap-2 text-sm text-slate-300">
							<Loader2 className="size-4 animate-spin" />
							Loading results...
						</div>
					)}

					{!loading && visibleResults.length === 0 && (
						<div className="mt-6 rounded-xl border border-slate-700/70 bg-slate-900/50 p-5 text-sm text-slate-300">
							No results found for the selected filters.
						</div>
					)}

					<div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{visibleResults.map((item) => {
							const progress = Math.max(0, Math.min(100, item.percentage));
							const chipClass = getChipClass(item.status);
							const progressClass = getProgressClass(item.status);
							const scoreClass = getScoreClass(item.status);
                            console.log('Rendering result card for:', item);
							return (
								<Card
									key={item.id}
									className="border border-slate-700/70 bg-[linear-gradient(145deg,rgba(20,33,64,0.95),rgba(11,22,45,0.98))] py-0 shadow-[0_22px_56px_-36px_rgba(37,99,235,0.7)]"
								>
									<CardContent className="flex h-full flex-col p-5">
										<div className="flex items-center justify-between gap-2">
											<span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${chipClass}`}>
												{item.topicTag}
											</span>
											<span className="inline-flex items-center gap-1 text-xs text-slate-400">
												<CalendarDays className="size-3.5" />
												{formatDate(item.examDate)}
											</span>
										</div>

										<h3 className="mt-4 text-3xl font-semibold leading-tight text-slate-100">{item.testName}</h3>
										<p className="mt-2 text-sm text-slate-400">{item.subtitle}</p>

										<div className="mt-5 grid grid-cols-2 gap-3 text-sm">
											<div>
												<p className="text-xs text-slate-500">Score</p>
												<p className={`text-4xl font-semibold ${scoreClass}`}>{item.percentage}%</p>
											</div>
											<div className="text-right">
												<p className="text-xs text-slate-500">Points</p>
												<p className="text-3xl font-semibold text-slate-100">{item.achievedMarks}<span className="text-sm text-slate-400"> / {item.totalMarks || '--'}</span></p>
											</div>
										</div>

										<div className="mt-3 h-2 w-full rounded-full bg-slate-700/75">
											<div
												className={`h-full rounded-full ${progressClass}`}
												style={{ width: `${progress}%` }}
											/>
										</div>

										<div className="mt-4 flex items-center justify-between gap-2 text-xs">
											<span className={`${item.status === 'review' ? 'text-rose-300' : 'text-slate-400'}`}>
												{item.hasAttempt
													? (item.status === 'review' ? 'Review suggested' : `${item.attemptCount} attempt(s) analyzed`)
													: 'No attempt recorded yet'}
											</span>

										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>

					{canLoadMore && (
						<div className="mt-9 flex justify-center">
							<Button
								type="button"
								variant="outline"
								onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
								className="h-10 rounded-full border-slate-600/80 bg-transparent px-6 text-sm font-semibold text-slate-100 hover:bg-slate-800/60"
							>
								<SlidersHorizontal className="size-4" />
								Load Previous Results
							</Button>
						</div>
					)}

					<div className="mt-8 flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => navigate('/examPortal/viewExam')}
							className="rounded-full border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
						>
							Back To Exams
						</Button>
						<Button
							type="button"
							onClick={() => navigate('/examPortal/viewExam')}
							className="rounded-full border border-cyan-300/70 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
						>
							Open Exam Dashboard
						</Button>
					</div>
				</section>
			</main>
		</div>
	);
}
