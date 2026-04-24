import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Clock3, Flag } from 'lucide-react';
import { apiPost } from '../../common/api.js';
import { getCookie } from '../../common/cookie.js';

const STORAGE_PREFIX = 'qs-test-attempt-';
const FOCUS_VIOLATION_COOLDOWN_MS = 1200;
const MAX_FOCUS_WARNINGS = 3;
const HEALTH_CHECK_INTERVAL_MS = 60 * 1000;
const HEALTH_ENDPOINT = 'http://localhost:8080/health';

const getValue = (source, keys = []) => {
    for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }
    return undefined;
};

const toPositiveInt = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
};

const formatTimer = (ms) => {
    const safe = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(safe / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((safe % 3600) / 60).toString().padStart(2, '0');
    const seconds = (safe % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

const detectQuestionType = (question = {}, sectionTitle = '') => {
    const rawType = String(getValue(question, [
        'type',
        'question_type',
        'questionType',
        'answer_type',
        'QuestionType',
    ]) || '').toUpperCase();

    const titleType = String(sectionTitle || '').toUpperCase();

    if (rawType.includes('MSQ') || rawType.includes('MULTI') || titleType.includes('MSQ')) {
        return 'MSQ';
    }

    if (
        rawType.includes('OPEN')
        || rawType.includes('TEXT')
        || rawType.includes('SUBJECTIVE')
        || rawType.includes('DESCRIPTIVE')
        || rawType.includes('ESSAY')
    ) {
        return 'OPEN_ENDED';
    }

    return 'MCQ';
};

const normalizeOptions = (question) => {
    const rawOptions = getValue(question, [
        'options',
        'Options',
        'choices',
        'choice_options',
        'answers',
        'option_list',
        'question_options',
    ]);

    if (!Array.isArray(rawOptions)) return [];

    return rawOptions.map((option, index) => {
        if (typeof option === 'string' || typeof option === 'number') {
            return {
                value: index + 1,
                label: String(option),
            };
        }

        const explicitValue = getValue(option, [
            'option_number',
            'optionNumber',
            'OptionNumber',
            'option_id',
            'optionId',
            'id',
            'value',
        ]);
        const parsedValue = Number(explicitValue);

        return {
            value: Number.isFinite(parsedValue) ? parsedValue : index + 1,
            label: String(getValue(option, [
                'option_text',
                'option',
                'text',
                'label',
                'title',
                'value',
            ]) || `Option ${index + 1}`),
        };
    });
};

const normalizeSectionsFromStart = (startPayload) => {
    const rawSections = startPayload?.test?.sections || startPayload?.sections || [];

    if (!Array.isArray(rawSections)) return [];

    return rawSections
        .map((section, sectionIndex) => {
            const rawQuestions = Array.isArray(section?.questions) ? section.questions : [];

            const normalizedQuestions = rawQuestions
                .map((question, index) => {
                    const questionNumber = toPositiveInt(getValue(question, ['questionNumber', 'question_number', 'id']), index + 1);
                    const type = detectQuestionType(question, section?.title);

                    return {
                        ...question,
                        questionNumber,
                        type,
                        text: String(getValue(question, ['questionText', 'question_text', 'question', 'text', 'prompt']) || `Question ${questionNumber}`),
                        points: getValue(question, ['successMarks', 'points', 'point', 'marks', 'score']),
                        options: normalizeOptions(question),
                    };
                })
                .sort((a, b) => a.questionNumber - b.questionNumber);

            return {
                sectionNumber: sectionIndex + 1,
                sectionId: toPositiveInt(getValue(section, ['sectionId', 'section_id', 'id']), sectionIndex + 1),
                title: getValue(section, ['title', 'name', 'section_title']) || `Section ${sectionIndex + 1}`,
                questions: normalizedQuestions,
                questionCount: normalizedQuestions.length,
            };
        })
        .filter((section) => section.questionCount > 0);
};

const clampPosition = (position, sections) => {
    if (!sections.length) return { sectionNumber: 1, questionIndex: 0 };

    const sectionNumber = Math.min(
        Math.max(toPositiveInt(position?.sectionNumber, 1), 1),
        sections.length
    );

    const section = sections[sectionNumber - 1];
    const maxIndex = Math.max(0, section.questionCount - 1);
    const questionIndex = Math.min(
        Math.max(Number.isFinite(Number(position?.questionIndex)) ? Number(position.questionIndex) : 0, 0),
        maxIndex
    );

    return {
        sectionNumber,
        questionIndex,
    };
};

const parseStoredSnapshot = (storageKey) => {
    if (!storageKey) return null;

    try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const hasAnswerValue = (answerEntry) => {
    if (!answerEntry) return false;

    if (answerEntry.type === 'MSQ') {
        return Array.isArray(answerEntry.value) && answerEntry.value.length > 0;
    }

    if (answerEntry.type === 'OPEN_ENDED') {
        return typeof answerEntry.value === 'string' && answerEntry.value.trim().length > 0;
    }

    return answerEntry.value !== undefined && answerEntry.value !== null && String(answerEntry.value).trim() !== '';
};

const isSectionCompleted = (section, answersBySection) => {
    if (!section || !Array.isArray(section.questions) || section.questions.length === 0) return false;

    const sectionAnswers = answersBySection?.[String(section.sectionNumber)] || {};
    return section.questions.every((question) => hasAnswerValue(sectionAnswers[String(question.questionNumber)]));
};

const getContiguousCompletedSectionCount = (sections, answersBySection) => {
    let count = 0;

    for (const section of sections) {
        if (!isSectionCompleted(section, answersBySection)) {
            break;
        }
        count += 1;
    }

    return count;
};

const removeSyncedPendingAnswers = (pendingAnswers, sentAnswers) => {
    if (!pendingAnswers || typeof pendingAnswers !== 'object') return {};
    if (!sentAnswers || typeof sentAnswers !== 'object') return pendingAnswers;

    const nextPending = { ...pendingAnswers };

    Object.entries(sentAnswers).forEach(([sectionKey, sentSectionAnswers]) => {
        if (!sentSectionAnswers || typeof sentSectionAnswers !== 'object') return;
        const currentSectionAnswers = nextPending[sectionKey];
        if (!currentSectionAnswers || typeof currentSectionAnswers !== 'object') return;

        const nextSectionAnswers = { ...currentSectionAnswers };

        Object.entries(sentSectionAnswers).forEach(([questionKey, sentAnswerEntry]) => {
            const currentEntry = nextSectionAnswers[questionKey];
            if (!currentEntry) return;

            if (JSON.stringify(currentEntry) === JSON.stringify(sentAnswerEntry)) {
                delete nextSectionAnswers[questionKey];
            }
        });

        if (Object.keys(nextSectionAnswers).length === 0) {
            delete nextPending[sectionKey];
        } else {
            nextPending[sectionKey] = nextSectionAnswers;
        }
    });

    return nextPending;
};

const pickAnswersForSections = (answersBySection, sections) => {
    if (!answersBySection || typeof answersBySection !== 'object') return {};

    return sections.reduce((acc, section) => {
        const sectionKey = String(section.sectionNumber);
        const sectionAnswers = answersBySection[sectionKey];
        if (sectionAnswers && typeof sectionAnswers === 'object') {
            acc[sectionKey] = sectionAnswers;
        }
        return acc;
    }, {});
};

const buildAnswerPayload = (answersBySection, sections) => ({
    sections: sections
        .map((section) => {
            const sectionKey = String(section.sectionNumber);
            const sectionAnswers = answersBySection?.[sectionKey] || {};

            const answers = Object.entries(sectionAnswers)
                .sort(([qa], [qb]) => Number(qa) - Number(qb))
                .map(([questionNumber, entry]) => {
                    const qNumber = toPositiveInt(questionNumber, 1);
                    if (!hasAnswerValue(entry)) return null;

                    if (entry.type === 'MSQ') {
                        const values = Array.isArray(entry.value)
                            ? entry.value.map((value) => Number(value)).filter((value) => Number.isFinite(value))
                            : [];

                        if (!values.length) return null;

                        return {
                            questionNumber: qNumber,
                            CorrectOptions: values,
                        };
                    }

                    if (entry.type === 'OPEN_ENDED') {
                        const text = String(entry.value || '').trim();
                        if (!text) return null;

                        return {
                            questionNumber: qNumber,
                            answer: text,
                        };
                    }

                    const option = Number(entry.value);
                    if (!Number.isFinite(option)) return null;

                    return {
                        questionNumber: qNumber,
                        CorrectOption: option,
                    };
                })
                .filter(Boolean);

            if (!answers.length) return null;

            return {
                sectionId: section.sectionId,
                answers,
            };
        })
        .filter(Boolean),
});

export default function ExamSession() {
    const navigate = useNavigate();
    const { state } = useLocation();

    const token = getCookie('qs-token');
    const startPayload = state?.startPayload || {};
    const exam = state?.exam || startPayload?.test || {};
    const attemptId = toPositiveInt(
        getValue(startPayload, ['answer_attempt_id', 'attempt_id', 'id'])
            || getValue(state, ['answer_attempt_id', 'attempt_id', 'attemptId']),
        0
    );

    const sections = useMemo(
        () => normalizeSectionsFromStart(startPayload),
        [startPayload]
    );

    const storageKey = attemptId ? `${STORAGE_PREFIX}${attemptId}` : null;
    const storedSnapshot = useMemo(() => parseStoredSnapshot(storageKey), [storageKey]);

    const [startedAt] = useState(() => Number(storedSnapshot?.startedAt) || Date.now());

    const durationMinutes = Math.max(1, toPositiveInt(getValue(exam, ['TestDuration', 'test_duration', 'duration']), 60));

    const computedEndAt = useMemo(() => {
        const now = Date.now();
        const attemptDurationEndAt = startedAt + durationMinutes * 60 * 1000;

        const examEndRaw = getValue(exam, ['TestEndTime', 'test_end_time', 'end_time']);
        const examEndAt = examEndRaw ? new Date(examEndRaw).getTime() : NaN;
        const hardCutoffEndAt = Number.isFinite(examEndAt)
            ? Math.min(attemptDurationEndAt, examEndAt)
            : attemptDurationEndAt;

        const fromStore = Number(storedSnapshot?.endAt);
        if (Number.isFinite(fromStore)) {
            return Math.min(fromStore, hardCutoffEndAt);
        }

        if (hardCutoffEndAt <= now) {
            return now;
        }

        return hardCutoffEndAt;
    }, [durationMinutes, exam, startedAt, storedSnapshot?.endAt]);

    const [endAt] = useState(computedEndAt);
    const [timeLeftMs, setTimeLeftMs] = useState(() => Math.max(0, endAt - Date.now()));

    const [currentPosition, setCurrentPosition] = useState(() =>
        clampPosition(storedSnapshot?.position, sections)
    );
    const [maxUnlockedSection, setMaxUnlockedSection] = useState(() => {
        const maxBySections = Math.max(1, sections.length);
        const storedMax = toPositiveInt(storedSnapshot?.maxUnlockedSection, 1);
        return Math.min(Math.max(storedMax, 1), maxBySections);
    });

    const [answersBySection, setAnswersBySection] = useState(() => storedSnapshot?.answersBySection || {});
    const [pendingAnswersBySection, setPendingAnswersBySection] = useState({});
    const [flagsBySection, setFlagsBySection] = useState(() => storedSnapshot?.flagsBySection || {});

    const [syncState, setSyncState] = useState({
        syncing: false,
        error: '',
        lastSyncedAt: Number(storedSnapshot?.lastSyncedAt) || null,
    });

    const [submitMessage, setSubmitMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [isFullscreen, setIsFullscreen] = useState(() => (
        typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
    ));
    const [fullscreenSupported] = useState(() => (
        typeof document !== 'undefined' && Boolean(document.documentElement?.requestFullscreen)
    ));
    const [fullscreenMessage, setFullscreenMessage] = useState('');
    const [focusViolations, setFocusViolations] = useState(0);
    const [healthCheckState, setHealthCheckState] = useState({
        checking: false,
        status: 'unknown',
        message: 'Health check pending',
        lastCheckedAt: null,
    });

    const autoSubmittedRef = useRef(false);
    const submitInFlightRef = useRef(false);
    const violationCooldownRef = useRef(0);
    const hadFullscreenRef = useRef(false);
    const focusViolationCountRef = useRef(0);
    const warningAlertOpenRef = useRef(false);
    const awaitingRecoveryRef = useRef(false);
    const previousFullscreenRef = useRef(
        typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
    );

    const requestFullscreenMode = useCallback(async () => {
        if (typeof document === 'undefined') return false;

        const rootElement = document.documentElement;
        if (!rootElement?.requestFullscreen) {
            setFullscreenMessage('Fullscreen mode is not supported in this browser.');
            return false;
        }

        if (document.fullscreenElement) {
            setIsFullscreen(true);
            setFullscreenMessage('');
            return true;
        }

        try {
            await rootElement.requestFullscreen();
            setIsFullscreen(true);
            setFullscreenMessage('');
            return true;
        } catch {
            setFullscreenMessage('Fullscreen is required. Click "Enter Fullscreen" to continue.');
            return false;
        }
    }, []);

    const runHardwareHealthCheck = useCallback(async () => {
        if (!attemptId || !token) return false;

        setHealthCheckState((prev) => ({ ...prev, checking: true }));

        try {
            const res = await axios.get(HEALTH_ENDPOINT, { timeout: 8000 });
            const serviceStatus = String(res?.data?.status || '').toUpperCase();
            const isOk = serviceStatus === 'OK';

            setHealthCheckState({
                checking: false,
                status: isOk ? 'ok' : 'issue',
                message: isOk ? 'System is perfect' : `Health status: ${serviceStatus || 'UNKNOWN'}`,
                lastCheckedAt: Date.now(),
            });

            return isOk;
        } catch (error) {
            setHealthCheckState({
                checking: false,
                status: 'issue',
                message: `Health check failed: ${error?.message || 'Unknown error'}`,
                lastCheckedAt: Date.now(),
            });
            return false;
        }
    }, [attemptId, token]);

    useEffect(() => {
        if (!token) {
            navigate('/login', { replace: true });
        }
    }, [navigate, token]);

    useEffect(() => {
        const maxBySections = Math.max(1, sections.length);
        setMaxUnlockedSection((prev) => Math.min(Math.max(prev, 1), maxBySections));
    }, [sections.length]);

    useEffect(() => {
        const contiguousCompleted = getContiguousCompletedSectionCount(sections, answersBySection);
        const nextUnlock = Math.min(sections.length, contiguousCompleted + 1);
        setMaxUnlockedSection((prev) => Math.max(prev, Math.max(1, nextUnlock)));
    }, [answersBySection, sections]);

    useEffect(() => {
        setCurrentPosition((prev) => {
            const clamped = clampPosition(prev, sections);
            if (clamped.sectionNumber <= maxUnlockedSection) return clamped;
            return clampPosition({ sectionNumber: maxUnlockedSection, questionIndex: 0 }, sections);
        });
    }, [sections, maxUnlockedSection]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setTimeLeftMs(Math.max(0, endAt - Date.now()));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [endAt]);

    // Persist only user progress and timer metadata; question bank stays in-memory.
    useEffect(() => {
        if (!storageKey) return;

        const snapshot = {
            startedAt,
            endAt,
            position: currentPosition,
            maxUnlockedSection,
            answersBySection,
            flagsBySection,
            lastSyncedAt: syncState.lastSyncedAt,
        };

        sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
    }, [storageKey, startedAt, endAt, currentPosition, maxUnlockedSection, answersBySection, flagsBySection, syncState.lastSyncedAt]);

    const totalQuestionCount = useMemo(
        () => sections.reduce((sum, section) => sum + section.questionCount, 0),
        [sections]
    );

    const answeredCount = useMemo(() => (
        Object.values(answersBySection).reduce((count, sectionAnswers) => {
            if (!sectionAnswers || typeof sectionAnswers !== 'object') return count;
            return count + Object.values(sectionAnswers).filter(hasAnswerValue).length;
        }, 0)
    ), [answersBySection]);

    const progressLabel = `${answeredCount} / ${totalQuestionCount}`;
    const unlockedSections = useMemo(
        () => sections.filter((section) => section.sectionNumber <= maxUnlockedSection),
        [sections, maxUnlockedSection]
    );

    const syncAnswers = useCallback(async ({ silent = false, sendAll = false } = {}) => {
        if (!attemptId || !token) return false;

        const changedAnswers = sendAll ? answersBySection : pendingAnswersBySection;
        if (!sendAll && (!changedAnswers || Object.keys(changedAnswers).length === 0)) {
            return true;
        }

        const cumulativeAnswers = pickAnswersForSections(answersBySection, unlockedSections);
        const answer = buildAnswerPayload(cumulativeAnswers, unlockedSections);
        if (!answer.sections.length) {
            if (!sendAll) {
                setPendingAnswersBySection((prev) => removeSyncedPendingAnswers(prev, changedAnswers));
            }
            return true;
        }

        setSyncState((prev) => ({ ...prev, syncing: true, error: silent ? prev.error : '' }));

        try {
            await apiPost('/api/test-portal/update-attempt-answer', {
                attempt_id: attemptId,
                answer,
            }, { token });

            if (sendAll) {
                setPendingAnswersBySection({});
            } else {
                setPendingAnswersBySection((prev) => removeSyncedPendingAnswers(prev, changedAnswers));
            }

            setSyncState({ syncing: false, error: '', lastSyncedAt: Date.now() });
            return true;
        } catch (error) {
            setSyncState((prev) => ({
                ...prev,
                syncing: false,
                error: error?.response?.data?.message || error?.message || 'Failed to sync answers',
            }));
            return false;
        }
    }, [answersBySection, attemptId, pendingAnswersBySection, token, unlockedSections]);

    const completeExam = useCallback(async (auto = false) => {
        if (submitInFlightRef.current) return;

        submitInFlightRef.current = true;
        setSubmitting(true);
        setSubmitMessage('');

        const synced = await syncAnswers({ sendAll: true });

        if (!synced) {
            setSubmitMessage('Unable to sync all answers. Please try submit again.');
            submitInFlightRef.current = false;
            setSubmitting(false);
            return;
        }

        if (storageKey) {
            sessionStorage.removeItem(storageKey);
        }

        submitInFlightRef.current = false;
        setSubmitting(false);

        navigate('/examPortal/viewExam', {
            replace: true,
            state: { autoSubmitted: auto, attemptId },
        });
    }, [attemptId, navigate, storageKey, syncAnswers]);

    const blockExamSession = useCallback(async (reason) => {
        if (submitInFlightRef.current) return;

        submitInFlightRef.current = true;
        setSubmitting(true);
        setSubmitMessage(reason);

        await syncAnswers({ sendAll: true, silent: true });

        if (storageKey) {
            sessionStorage.removeItem(storageKey);
        }

        if (typeof window !== 'undefined') {
            warningAlertOpenRef.current = true;
            try {
                window.alert(reason);
            } finally {
                warningAlertOpenRef.current = false;
            }
        }

        submitInFlightRef.current = false;
        setSubmitting(false);

        navigate('/examPortal/viewExam', {
            replace: true,
            state: {
                blockedByProctor: true,
                blockedReason: reason,
                attemptId,
            },
        });
    }, [attemptId, navigate, storageKey, syncAnswers]);

    const handleFocusViolation = useCallback(async (message) => {
        if (submitInFlightRef.current || warningAlertOpenRef.current || awaitingRecoveryRef.current || !attemptId || !token) return;

        const now = Date.now();
        if (now - violationCooldownRef.current < FOCUS_VIOLATION_COOLDOWN_MS) return;
        violationCooldownRef.current = now;
        awaitingRecoveryRef.current = true;

        const nextWarnings = focusViolationCountRef.current + 1;
        focusViolationCountRef.current = nextWarnings;
        setFocusViolations(nextWarnings);

        const reason = message || 'Tab or app switching detected during exam.';
        const warningsLeft = Math.max(0, MAX_FOCUS_WARNINGS - nextWarnings);

        if (warningsLeft > 0) {
            const warningText = `${reason}\nWarning ${nextWarnings}/${MAX_FOCUS_WARNINGS}. ${warningsLeft} warning${warningsLeft === 1 ? '' : 's'} left before exam is blocked.`;
            setSubmitMessage(`Warning ${nextWarnings}/${MAX_FOCUS_WARNINGS}: ${reason}`);

            if (typeof window !== 'undefined') {
                warningAlertOpenRef.current = true;
                try {
                    window.alert(warningText);
                } finally {
                    warningAlertOpenRef.current = false;
                }
            }

            if (fullscreenSupported) {
                await requestFullscreenMode();
            }

            if (typeof document !== 'undefined') {
                const recoveredNow = (
                    document.visibilityState === 'visible'
                    && document.hasFocus()
                    && (!fullscreenSupported || Boolean(document.fullscreenElement))
                );

                if (recoveredNow) {
                    awaitingRecoveryRef.current = false;
                }
            }
            return;
        }

        await blockExamSession(`Exam blocked during exam. Reason: ${reason}`);
    }, [attemptId, blockExamSession, fullscreenSupported, requestFullscreenMode, token]);

    useEffect(() => {
        if (!fullscreenSupported) return;
        void requestFullscreenMode();
    }, [fullscreenSupported, requestFullscreenMode]);

    useEffect(() => {
        if (typeof document === 'undefined') return undefined;

        const onFullscreenChange = () => {
            const active = Boolean(document.fullscreenElement);
            setIsFullscreen(active);

            if (active) {
                hadFullscreenRef.current = true;
                setFullscreenMessage('');
            } else if (fullscreenSupported) {
                setFullscreenMessage('Fullscreen is required for this exam.');
            }
        };

        document.addEventListener('fullscreenchange', onFullscreenChange);
        onFullscreenChange();

        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
    }, [fullscreenSupported]);

    useEffect(() => {
        const wasFullscreen = previousFullscreenRef.current;
        previousFullscreenRef.current = isFullscreen;

        if (!fullscreenSupported || !hadFullscreenRef.current) return;
        if (!wasFullscreen || isFullscreen) return;

        if (typeof document !== 'undefined') {
            if (document.visibilityState !== 'visible' || !document.hasFocus()) {
                return;
            }
        }

        void handleFocusViolation('Fullscreen mode was exited during exam.');
    }, [fullscreenSupported, handleFocusViolation, isFullscreen]);

    useEffect(() => {
        if (!attemptId || !token) return undefined;

        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                void handleFocusViolation('Tab or app switching detected during exam.');
                return;
            }

            if (!fullscreenSupported || Boolean(document.fullscreenElement)) {
                awaitingRecoveryRef.current = false;
            }
        };

        const onWindowBlur = () => {
            if (document.visibilityState === 'visible') {
                void handleFocusViolation('Window focus was lost during exam.');
            }
        };

        const onWindowFocus = () => {
            if (!fullscreenSupported || Boolean(document.fullscreenElement)) {
                awaitingRecoveryRef.current = false;
            }
        };

        const onKeyDown = (event) => {
            const key = String(event.key || '').toLowerCase();
            const ctrlOrMeta = event.ctrlKey || event.metaKey;

            const isTabCycle = event.ctrlKey && key === 'tab';
            const isBrowserTabShortcut = ctrlOrMeta && (key === 't' || key === 'w' || key === 'n');
            const isRefreshShortcut = ctrlOrMeta && key === 'r';
            const isFullscreenToggle = key === 'f11';

            if (isTabCycle || isBrowserTabShortcut || isRefreshShortcut || isFullscreenToggle) {
                event.preventDefault();
                void handleFocusViolation('Blocked tab/window switching shortcut detected during exam.');
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('blur', onWindowBlur);
        window.addEventListener('focus', onWindowFocus);
        window.addEventListener('keydown', onKeyDown, true);

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('blur', onWindowBlur);
            window.removeEventListener('focus', onWindowFocus);
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [attemptId, fullscreenSupported, handleFocusViolation, token]);

    useEffect(() => {
        if (!attemptId || !token) return undefined;

        const timer = window.setInterval(() => {
            void runHardwareHealthCheck();
        }, HEALTH_CHECK_INTERVAL_MS);

        return () => window.clearInterval(timer);
    }, [attemptId, runHardwareHealthCheck, token]);

    useEffect(() => {
        if (!attemptId || !token) return;
        void runHardwareHealthCheck();
    }, [attemptId, currentPosition.questionIndex, currentPosition.sectionNumber, runHardwareHealthCheck, token]);

    useEffect(() => {
        if (timeLeftMs > 0 || autoSubmittedRef.current) return;

        autoSubmittedRef.current = true;
        void completeExam(true);
    }, [completeExam, timeLeftMs]);

    if (!token) {
        return null;
    }

    if (!attemptId) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
                <div className="w-full max-w-xl rounded-2xl border border-rose-400/30 bg-rose-950/30 p-6">
                    <h1 className="text-xl font-semibold">Unable to load exam attempt</h1>
                    <p className="mt-2 text-sm text-rose-100/90">
                        Start the exam from the exam list so we can initialize answer attempt details.
                    </p>
                    <Button className="mt-5" onClick={() => navigate('/examPortal/viewExam')}>Back to Exams</Button>
                </div>
            </div>
        );
    }

    if (!sections.length) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
                <div className="w-full max-w-xl rounded-2xl border border-rose-400/30 bg-rose-950/30 p-6">
                    <h1 className="text-xl font-semibold">No questions received</h1>
                    <p className="mt-2 text-sm text-rose-100/90">
                        The start API did not return section questions. Please restart the exam attempt.
                    </p>
                    <Button className="mt-5" onClick={() => navigate('/examPortal/viewExam')}>Back to Exams</Button>
                </div>
            </div>
        );
    }

    const currentSection = sections[currentPosition.sectionNumber - 1] || sections[0];
    const currentQuestion = currentSection.questions[currentPosition.questionIndex] || currentSection.questions[0];

    const currentSectionKey = String(currentPosition.sectionNumber);
    const currentQuestionKey = String(currentQuestion.questionNumber);

    const currentAnswer = answersBySection?.[currentSectionKey]?.[currentQuestionKey] || null;
    const currentFlags = Array.isArray(flagsBySection?.[currentSectionKey]) ? flagsBySection[currentSectionKey] : [];
    const isCurrentFlagged = currentFlags.includes(currentQuestion.questionNumber);

    const markFlag = () => {
        setFlagsBySection((prev) => {
            const sectionKey = String(currentPosition.sectionNumber);
            const list = Array.isArray(prev[sectionKey]) ? prev[sectionKey] : [];
            const exists = list.includes(currentQuestion.questionNumber);

            return {
                ...prev,
                [sectionKey]: exists
                    ? list.filter((number) => number !== currentQuestion.questionNumber)
                    : [...list, currentQuestion.questionNumber],
            };
        });
    };

    const setCurrentAnswer = (entry) => {
        setAnswersBySection((prev) => {
            const sectionAnswers = prev[currentSectionKey] || {};
            return {
                ...prev,
                [currentSectionKey]: {
                    ...sectionAnswers,
                    [currentQuestionKey]: entry,
                },
            };
        });

        setPendingAnswersBySection((prev) => {
            const sectionAnswers = prev[currentSectionKey] || {};
            return {
                ...prev,
                [currentSectionKey]: {
                    ...sectionAnswers,
                    [currentQuestionKey]: entry,
                },
            };
        });
    };

    const updateMcq = (optionValue) => {
        setCurrentAnswer({ type: 'MCQ', value: optionValue });
    };

    const updateMsq = (optionValue) => {
        const existingValues = currentAnswer?.type === 'MSQ' && Array.isArray(currentAnswer.value)
            ? currentAnswer.value
            : [];

        const nextValues = existingValues.includes(optionValue)
            ? existingValues.filter((value) => value !== optionValue)
            : [...existingValues, optionValue].sort((a, b) => a - b);

        setCurrentAnswer({ type: 'MSQ', value: nextValues });
    };

    const updateOpenEnded = (textValue) => {
        setCurrentAnswer({ type: 'OPEN_ENDED', value: textValue });
    };

    const jumpToQuestion = async (sectionNumber, questionIndex) => {
        if (sectionNumber > maxUnlockedSection) {
            return;
        }
        const synced = await syncAnswers({ silent: true });
        if (!synced) {
            setSubmitMessage('Unable to save answers. Please try again.');
            return;
        }
        setSubmitMessage('');
        setCurrentPosition(clampPosition({ sectionNumber, questionIndex }, sections));
    };

    const movePrevious = async () => {
        const synced = await syncAnswers({ silent: true });
        if (!synced) {
            setSubmitMessage('Unable to save answers. Please try again.');
            return;
        }
        setSubmitMessage('');

        if (currentPosition.questionIndex > 0) {
            setCurrentPosition({
                sectionNumber: currentPosition.sectionNumber,
                questionIndex: currentPosition.questionIndex - 1,
            });
            return;
        }

        if (currentPosition.sectionNumber > 1) {
            const previousSection = sections[currentPosition.sectionNumber - 2];
            setCurrentPosition({
                sectionNumber: currentPosition.sectionNumber - 1,
                questionIndex: Math.max(0, previousSection.questionCount - 1),
            });
        }
    };

    const moveNext = async () => {
        const synced = await syncAnswers({ silent: true });
        if (!synced) {
            setSubmitMessage('Unable to save answers. Please try again.');
            return;
        }
        setSubmitMessage('');

        if (currentPosition.questionIndex < currentSection.questionCount - 1) {
            setCurrentPosition({
                sectionNumber: currentPosition.sectionNumber,
                questionIndex: currentPosition.questionIndex + 1,
            });
            return;
        }

        if (currentPosition.sectionNumber < sections.length) {
            const nextSectionNumber = currentPosition.sectionNumber + 1;
            const canEnterNextSection = (
                nextSectionNumber <= maxUnlockedSection
                || isSectionCompleted(currentSection, answersBySection)
            );

            if (!canEnterNextSection) {
                setSubmitMessage('Complete all questions in this section to unlock the next section.');
                return;
            }

            if (nextSectionNumber > maxUnlockedSection) {
                setMaxUnlockedSection(nextSectionNumber);
            }

            setCurrentPosition({
                sectionNumber: nextSectionNumber,
                questionIndex: 0,
            });
        }
    };

    const atFirst = currentPosition.sectionNumber === 1 && currentPosition.questionIndex === 0;
    const atLast = (
        currentPosition.sectionNumber === sections.length
        && currentPosition.questionIndex === currentSection.questionCount - 1
    );
    const atSectionEnd = currentPosition.questionIndex === currentSection.questionCount - 1;
    const hasNextSection = currentPosition.sectionNumber < sections.length;
    const canEnterNextSection = hasNextSection && (
        currentPosition.sectionNumber + 1 <= maxUnlockedSection
        || isSectionCompleted(currentSection, answersBySection)
    );
    const nextDisabled = atLast || (atSectionEnd && hasNextSection && !canEnterNextSection);

    const timerWarning = timeLeftMs <= 5 * 60 * 1000;
    const questionType = currentQuestion.type || 'MCQ';
    const options = currentQuestion.options || [];

    const lastSyncedText = syncState.lastSyncedAt
        ? new Date(syncState.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'Not synced yet';
    const lastHealthCheckText = healthCheckState.lastCheckedAt
        ? new Date(healthCheckState.lastCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'Not checked yet';
    const warningsLeft = Math.max(0, MAX_FOCUS_WARNINGS - focusViolations);

    return (
        <div className="min-h-screen bg-[#020b21] text-slate-100">
            {fullscreenSupported && !isFullscreen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020b21]/95 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-amber-300/30 bg-[#081631] p-6 text-center">
                        <AlertCircle className="mx-auto mb-3 size-8 text-amber-200" />
                        <h2 className="text-lg font-semibold text-slate-100">Fullscreen Required</h2>
                        <p className="mt-2 text-sm text-slate-300">
                            Keep this exam in fullscreen. Tab or app switching gives 3 warnings, then blocks the exam.
                        </p>
                        {fullscreenMessage && (
                            <p className="mt-2 text-xs text-amber-200">{fullscreenMessage}</p>
                        )}
                        <Button className="mt-5 w-full" onClick={() => { void requestFullscreenMode(); }}>
                            Enter Fullscreen
                        </Button>
                    </div>
                </div>
            )}

            <header className="border-b border-cyan-300/15 bg-[#06122e]">
                <div className="mx-auto flex w-full max-w-[1300px] flex-wrap items-center justify-between gap-3 px-4 py-4 lg:px-6">
                    <div className="min-w-0">
                        <p className="text-lg font-semibold text-cyan-300">QuantumScholar</p>
                        <h1 className="truncate text-sm font-semibold text-slate-100 md:text-base">
                            {getValue(exam, ['title', 'TestName', 'test_name']) || getValue(startPayload?.test, ['title']) || 'Exam Session'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200">
                            Progress {progressLabel}
                        </div>
                        {fullscreenSupported && (
                            <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${isFullscreen ? 'border-emerald-300/45 bg-emerald-400/15 text-emerald-100' : 'border-amber-300/45 bg-amber-500/15 text-amber-100'}`}>
                                {isFullscreen ? 'Fullscreen On' : 'Fullscreen Off'}
                            </div>
                        )}
                        <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${timerWarning ? 'border-rose-300/50 bg-rose-500/20 text-rose-100' : 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100'}`}>
                            <Clock3 className="mr-1 inline size-4" />{formatTimer(timeLeftMs)}
                        </div>
                        <Button
                            type="button"
                            disabled={submitting || syncState.syncing}
                            onClick={() => void completeExam(false)}
                            className="rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                        >
                            {submitting ? 'Submitting...' : 'Submit Exam'}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto grid w-full max-w-[1300px] gap-4 px-4 py-4 lg:grid-cols-[290px_minmax(0,1fr)] lg:px-6">
                <aside className="rounded-2xl border border-cyan-300/10 bg-[#07142f] p-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold tracking-wide text-slate-200">Question Navigator</h2>
                        <button
                            type="button"
                            onClick={markFlag}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${isCurrentFlagged ? 'border-amber-300/60 bg-amber-400/20 text-amber-100' : 'border-slate-400/40 bg-slate-500/20 text-slate-200'}`}
                        >
                            <Flag className="size-3.5" />
                            {isCurrentFlagged ? 'Flagged' : 'Flag'}
                        </button>
                    </div>

                    <div className="mt-3 space-y-4">
                        {sections.map((section) => (
                            <div key={section.sectionNumber}>
                                <p className="mb-2 text-xs font-semibold tracking-wide text-cyan-200/90">
                                    {section.title}
                                </p>
                                <div className="grid grid-cols-5 gap-2">
                                    {section.questions.map((question, questionIndex) => {
                                        const sectionLocked = section.sectionNumber > maxUnlockedSection;
                                        const isCurrent = (
                                            section.sectionNumber === currentPosition.sectionNumber
                                            && questionIndex === currentPosition.questionIndex
                                        );

                                        const answered = hasAnswerValue(
                                            answersBySection?.[String(section.sectionNumber)]?.[String(question.questionNumber)]
                                        );

                                        const flagged = Array.isArray(flagsBySection?.[String(section.sectionNumber)])
                                            && flagsBySection[String(section.sectionNumber)].includes(question.questionNumber);

                                        return (
                                            <button
                                                key={`${section.sectionNumber}-${question.questionNumber}`}
                                                type="button"
                                                disabled={sectionLocked}
                                                onClick={() => {
                                                    void jumpToQuestion(section.sectionNumber, questionIndex);
                                                }}
                                                className={`h-9 rounded-lg border text-xs font-semibold transition ${sectionLocked
                                                    ? 'cursor-not-allowed border-slate-700/40 bg-slate-900/30 text-slate-500'
                                                    : isCurrent
                                                        ? 'border-cyan-200 bg-cyan-400/30 text-cyan-50'
                                                        : flagged
                                                            ? 'border-amber-300/50 bg-amber-400/20 text-amber-100'
                                                            : answered
                                                                ? 'border-emerald-300/40 bg-emerald-500/20 text-emerald-100'
                                                                : 'border-slate-500/40 bg-slate-700/40 text-slate-200 hover:bg-slate-700/65'
                                                    }`}
                                            >
                                                {question.questionNumber}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-500/40 bg-slate-800/40 p-3 text-xs text-slate-200">
                        <p>Last sync: {lastSyncedText}</p>
                        {fullscreenSupported && (
                            <p className="mt-2">Fullscreen: {isFullscreen ? 'Active' : 'Required'}</p>
                        )}
                        <p className={`mt-2 ${healthCheckState.status === 'ok' ? 'text-emerald-200' : 'text-amber-200'}`}>
                            Hardware health: {healthCheckState.status === 'ok' ? 'System is perfect' : healthCheckState.message}
                            {healthCheckState.checking ? ' (checking...)' : ''}
                        </p>
                        <p className="mt-2">Health checked at: {lastHealthCheckText}</p>
                        {focusViolations > 0 && (
                            <p className="mt-2 text-amber-200">Warnings used: {focusViolations}/{MAX_FOCUS_WARNINGS} (left: {warningsLeft})</p>
                        )}
                        {syncState.error && (
                            <p className="mt-2 text-rose-200">{syncState.error}</p>
                        )}
                        {submitMessage && (
                            <p className="mt-2 text-rose-200">{submitMessage}</p>
                        )}
                    </div>
                </aside>

                <section className="rounded-2xl border border-cyan-300/10 bg-[#040f28] p-5 md:p-7">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-cyan-200">
                        <span className="rounded-full bg-cyan-400/20 px-3 py-1">{questionType}</span>
                        {currentQuestion.points ? (
                            <span className="rounded-full bg-slate-500/40 px-3 py-1 text-slate-100">
                                {currentQuestion.points} Points
                            </span>
                        ) : null}
                    </div>

                    <h2 className="mt-4 text-2xl font-semibold leading-snug text-slate-100">
                        {currentQuestion.text || `Question ${currentQuestion.questionNumber}`}
                    </h2>

                    {questionType === 'OPEN_ENDED' && (
                        <div className="mt-6">
                            <label className="mb-2 block text-sm font-semibold text-slate-200">Your Answer</label>
                            <textarea
                                value={currentAnswer?.type === 'OPEN_ENDED' ? currentAnswer.value : ''}
                                onChange={(event) => updateOpenEnded(event.target.value)}
                                rows={8}
                                className="w-full rounded-xl border border-slate-500/40 bg-slate-900/40 p-3 text-sm text-slate-100 outline-none ring-cyan-300/40 placeholder:text-slate-400 focus:ring"
                                placeholder="Type your answer here..."
                            />
                        </div>
                    )}

                    {(questionType === 'MCQ' || questionType === 'MSQ') && (
                        <div className="mt-6 space-y-3">
                            {options.map((option) => {
                                const optionValue = Number(option.value);

                                const isChecked = questionType === 'MCQ'
                                    ? currentAnswer?.type === 'MCQ' && Number(currentAnswer.value) === optionValue
                                    : currentAnswer?.type === 'MSQ'
                                        && Array.isArray(currentAnswer.value)
                                        && currentAnswer.value.includes(optionValue);

                                return (
                                    <button
                                        key={`${option.value}-${option.label}`}
                                        type="button"
                                        onClick={() => (questionType === 'MCQ' ? updateMcq(optionValue) : updateMsq(optionValue))}
                                        className={`w-full rounded-xl border px-4 py-4 text-left transition ${isChecked
                                            ? 'border-cyan-200/80 bg-cyan-400/20 text-cyan-50'
                                            : 'border-slate-500/35 bg-slate-800/40 text-slate-200 hover:border-cyan-300/45 hover:bg-slate-700/45'
                                            }`}
                                    >
                                        <span className="mr-3 inline-flex size-7 items-center justify-center rounded-full border border-current text-xs font-semibold">
                                            {questionType === 'MCQ' ? 'O' : '+'}
                                        </span>
                                        {option.label}
                                        {isChecked ? <CheckCircle2 className="ml-2 inline size-4" /> : null}
                                    </button>
                                );
                            })}

                            {!options.length && (
                                <p className="text-sm text-slate-400">
                                    This question has no options. Please refresh or contact support.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" disabled={atFirst} onClick={() => { void movePrevious(); }}>Previous</Button>
                            <Button type="button" variant="outline" disabled={nextDisabled} onClick={() => { void moveNext(); }}>Next</Button>
                        </div>
                        <Button type="button" variant="outline" disabled={syncState.syncing} onClick={() => void syncAnswers({ sendAll: true })}>
                            {syncState.syncing ? 'Saving...' : 'Save Now'}
                        </Button>
                    </div>
                </section>
            </main>
        </div>
    );
}
