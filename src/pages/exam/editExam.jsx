import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPut, apiPost } from '../../common/api.js';
import { getCookie } from '../../common/cookie.js';
import { useQuery } from '../../common/appUtils.js';
import { idbGetTest, idbReplaceDraft, idbUpsertDraft } from '../../common/idbTestStore.js';
import Dropdown from 'react-bootstrap/Dropdown';
import Navbar from '../../components/navbar.jsx';


/* Question / section factories */
const makeEmptyTest = (title = 'Untitled Test') => ({ title, sections: [] });
const makeEmptySection = (sectionId) => ({ sectionId, title: `Section ${sectionId}`, questionsToDisplay: 0, questions: [] });
const makeEmptyQuestion = (type = 'mcq') => {
  // Start with 2 options minimal; user can add more dynamically
  if (type === 'msq') return { questionNumber: 0, type: 'msq', questionText: '', options: ['', ''], correctOptions: [], successMarks: 1, failureMarks: 0 };
  if (type === 'open') return { questionNumber: 0, type: 'open', questionText: '', modelAnswer: '', successMarks: 5, failureMarks: 0 };
  // MCQ default correctOption is -1 (unset) so choosing first option registers a change
  return { questionNumber: 0, type: 'mcq', questionText: '', options: ['', ''], correctOption: -1, successMarks: 1, failureMarks: 0 };
};
const reindex = (section) => ({ ...section, questions: section.questions.map((q, i) => ({ ...q, questionNumber: i + 1 })) });


// Robust parser for backend questions_json (string) -> internal draft
function parseBackendQuestionsJson(jsonString, fallbackTitle='Untitled Test') {
  if (!jsonString || jsonString === '{}' || jsonString === 'null') {
    return makeEmptyTest(fallbackTitle);
  }
  let raw;
  try { raw = JSON.parse(jsonString); } catch { return makeEmptyTest(fallbackTitle); }
  if (!raw || typeof raw !== 'object') return makeEmptyTest(fallbackTitle);
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  return {
    title: raw.title || fallbackTitle,
    sections: sections.map((s, sIdx) => {
      const questions = Array.isArray(s.questions) ? s.questions : [];
      return reindex({
        sectionId: s.sectionId || s.section_id || (sIdx + 1),
        title: s.title || `Section ${sIdx + 1}`,
        questionsToDisplay: s.questionsToDisplay || s.questions_to_display || questions.length,
        questions: questions.map((q, qIdx) => {
          const baseType = q.type === 'open-ended' ? 'open' : (q.type || 'mcq');
          const mcqDefaults = ['', '', '', ''];
          // Use provided options; ensure at least 2 for choice types
          const opts = q.options ? [...q.options] : (baseType === 'open' ? [] : [...mcqDefaults]);
          if (baseType !== 'open' && opts.length < 2) {
            while (opts.length < 2) opts.push('');
          }
          return {
            questionNumber: q.questionNumber || q.question_number || (qIdx + 1),
            type: baseType,
            questionText: q.questionText || q.question_text || '',
            options: opts,
            // Backend may store 1-based indices; convert to 0-based internally. If null/undefined -> -1
            correctOption: (() => {
              const rawIdx = q.correctOption ?? q.correct_option;
              if (rawIdx == null) return -1;
              const zero = Number(rawIdx) - 1; // convert 1-based to 0-based
              return zero >= 0 ? zero : -1;
            })(),
            correctOptions: (() => {
              const arr = q.correctOptions || q.correct_options || [];
              if (!Array.isArray(arr)) return [];
              // convert each 1-based index to 0-based, filter invalid
              return arr.map(v => Number(v) - 1).filter(v => v >= 0);
            })(),
            modelAnswer: q.modelAnswer || q.model_answer || '',
            successMarks: q.successMarks ?? q.success_marks ?? (baseType === 'open' ? 10 : 1),
            failureMarks: q.failureMarks ?? q.failure_marks ?? (baseType === 'mcq' || baseType === 'msq' ? 0 : 0),
          };
        })
      });
    })
  };
}

export default function EditExam() {
  const navigate = useNavigate();
  const query = useQuery();
  const id = query.get('test_id');
  const token = getCookie('qs-token');
  const [uploader, setUploader] = useState(false);
  const [uploaderTarget, setUploaderTarget] = useState({ kind:'question', optionIndex:null });

  const [loading, setLoading] = useState(true);
  const [remote, setRemote] = useState(null); // server payload
  const [draft, setDraft] = useState(makeEmptyTest());
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonErr, setJsonErr] = useState('');
  const [selected, setSelected] = useState({ sectionId: null, questionNumber: null });
  const [reloading, setReloading] = useState(false);

  // Initial load & any fetch triggers
  const fetchRemote = async (force=false) => {
    const res = await apiGet(`/api/test/${encodeURIComponent(id)}`, { token });
    const data = res?.data;
    if (!data) throw new Error('Exam not found');
    setRemote(data);
    const remoteStruct = parseBackendQuestionsJson(data.questions_json, data.test_name || 'Untitled Test');
    const local = await idbGetTest(id);

    // Decide whether to overwrite local draft
    let useRemote = false;
    if (!local) useRemote = true; // nothing cached
    else if (force) useRemote = true; // explicit refresh
    else if (!local.draft.sections?.length && remoteStruct.sections.length) useRemote = true; // local empty, remote has content
    else if (remoteStruct.sections.length > local.draft.sections.length) useRemote = true; // remote grew

    if (useRemote) {
      await idbReplaceDraft(id, remoteStruct, data.created_at || data.updated_at);
      setDraft(remoteStruct);
      setDirty(false);
    } else if (local && !draft.sections.length) {
      setDraft(local.draft);
    }
  };

  // Initial load: IDB first, then remote.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!token) { navigate('/login'); return; }
      if (!id) { setError('No exam id'); navigate('/exam/manageExam'); return; }
      try {
        setLoading(true);
        const local = await idbGetTest(id);
        if (local && local.draft && !cancelled) setDraft(local.draft);
        await fetchRemote(false);
      } catch (e) {
        console.error(e); if (!cancelled) setError(e.message || 'Failed to load exam');
      } finally { if (!cancelled) setLoading(false); }
    }
    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, navigate]);

  const handleReload = async () => {
    try { setReloading(true); await fetchRemote(true); setSaveMsg('Reloaded from server'); } catch (e) { console.error(e); setSaveMsg(e.message || 'Reload failed'); } finally { setReloading(false); setTimeout(()=> setSaveMsg(''), 3000); }
  };

  // Derived totals
  const derived = useMemo(() => {
    const totalQuestions = draft.sections.reduce((sum, s) => sum + s.questions.length, 0);
    const totalMarks = draft.sections.reduce((sum, s) => sum + s.questions.reduce((a, q) => a + (parseFloat(q.successMarks) || 0), 0), 0);
    return { totalQuestions, totalMarks };
  }, [draft]);

  // Helpers writing to IDB
  const mutate = async (fn) => {
    const updated = await idbUpsertDraft(id, fn);
    setDraft(updated.draft);
    setDirty(true);
  };

  const addSection = () => mutate(prev => {
    const nextId = prev.sections.reduce((m, s) => Math.max(m, s.sectionId || 0), 0) + 1;
    const updated = { ...prev, sections: [...prev.sections, makeEmptySection(nextId)] };
    setSelected({ sectionId: nextId, questionNumber: null });
    return updated;
  });

  const updateSectionTitle = (sectionId, title) => mutate(prev => ({ ...prev, sections: prev.sections.map(s => s.sectionId === sectionId ? { ...s, title } : s) }));
  const updateSectionQty = (sectionId, qty) => mutate(prev => ({ ...prev, sections: prev.sections.map(s => s.sectionId === sectionId ? { ...s, questionsToDisplay: qty } : s) }));
  const deleteSection = (sectionId) => { if (!confirm('Delete section?')) return; mutate(prev => { const remaining = prev.sections.filter(s => s.sectionId !== sectionId); const updated = { ...prev, sections: remaining }; if (selected.sectionId === sectionId) setSelected({ sectionId: remaining[0]?.sectionId || null, questionNumber: null }); return updated; }); };
  const moveSection = (sectionId, dir) => mutate(prev => {
    const idx = prev.sections.findIndex(s => s.sectionId === sectionId); if (idx < 0) return prev;
    const target = dir === 'up' ? idx - 1 : idx + 1; if (target < 0 || target >= prev.sections.length) return prev;
    const arr = [...prev.sections]; const [sp] = arr.splice(idx, 1); arr.splice(target, 0, sp); return { ...prev, sections: arr };
  });

  const addQuestion = (sectionId, type) => mutate(prev => ({
    ...prev, sections: prev.sections.map(s => {
      if (s.sectionId !== sectionId) return s; const q = makeEmptyQuestion(type); const qs = [...s.questions, { ...q, questionNumber: s.questions.length + 1 }];
      setSelected({ sectionId, questionNumber: qs.length });
      return { ...s, questions: qs, questionsToDisplay: Math.max(s.questionsToDisplay, qs.length) };
    })
  }));
  const updateQuestion = (sectionId, questionNumber, patch) => mutate(prev => ({
    ...prev, sections: prev.sections.map(s => {
      if (s.sectionId !== sectionId) return s; const qs = s.questions.map(q => q.questionNumber === questionNumber ? { ...q, ...patch } : q); return reindex({ ...s, questions: qs });
    })
  }));
  const deleteQuestion = (sectionId, questionNumber) => { if (!confirm('Delete question?')) return; mutate(prev => ({ ...prev, sections: prev.sections.map(s => { if (s.sectionId !== sectionId) return s; const qs = s.questions.filter(q => q.questionNumber !== questionNumber); const re = reindex({ ...s, questions: qs }); if (selected.sectionId === sectionId) { if (questionNumber === selected.questionNumber) { setSelected({ sectionId, questionNumber: re.questions[0]?.questionNumber || null }); } } return re; }) })); };
  const moveQuestion = (sectionId, questionNumber, dir) => mutate(prev => ({ ...prev, sections: prev.sections.map(s => { if (s.sectionId !== sectionId) return s; const idx = s.questions.findIndex(q => q.questionNumber === questionNumber); if (idx < 0) return s; const target = dir === 'up' ? idx - 1 : idx + 1; if (target < 0 || target >= s.questions.length) return s; const arr = [...s.questions]; const [q] = arr.splice(idx, 1); arr.splice(target, 0, q); return reindex({ ...s, questions: arr }); }) }));
  const changeQuestionType = (sectionId, questionNumber, newType) => mutate(prev => ({ ...prev, sections: prev.sections.map(s => { if (s.sectionId !== sectionId) return s; const qs = s.questions.map(q => { if (q.questionNumber !== questionNumber) return q; const fresh = makeEmptyQuestion(newType); return { ...fresh, questionNumber: q.questionNumber }; }); return { ...s, questions: qs }; }) }));

  // JSON editor
  const openJson = () => { setJsonText(JSON.stringify(draft, null, 2)); setJsonErr(''); setShowJson(true); };
  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== 'object') throw new Error('Root must be object');
      if (!Array.isArray(parsed.sections)) parsed.sections = [];
      parsed.sections = parsed.sections.map((s, i) => reindex({ sectionId: s.sectionId || i + 1, title: s.title || `Section ${i + 1}`, questionsToDisplay: s.questionsToDisplay || (s.questions ? s.questions.length : 0), questions: Array.isArray(s.questions) ? s.questions : [] }));
      mutate(() => parsed); // mutate will set dirty & persist
      setShowJson(false);
    } catch (e) { setJsonErr(e.message); }
  };

  // Save to server
  const validate = () => {
    const errs = [];
    if (!draft.title || !draft.title.trim()) errs.push('Test title required');
    draft.sections.forEach((s, si) => {
      if (!s.title || !s.title.trim()) errs.push(`Section ${si + 1} title required`);
      if (!s.questions.length) errs.push(`Section ${si + 1} needs at least one question`);
      s.questions.forEach((q, qi) => {
        if (!q.questionText || !q.questionText.trim()) errs.push(`Section ${si + 1} Q${qi + 1} text required`);
        if (q.type === 'mcq') {
          if (!Array.isArray(q.options) || q.options.length < 2) errs.push(`Section ${si + 1} Q${qi + 1} MCQ needs 2+ options`);
          const nonEmpty = q.options.filter(o=> (o||'').trim().length>0);
            if (nonEmpty.length < 2) errs.push(`Section ${si + 1} Q${qi + 1} MCQ needs 2+ non-empty options`);
          if (typeof q.correctOption !== 'number' || q.correctOption < 0 || q.correctOption >= q.options.length) errs.push(`Section ${si + 1} Q${qi + 1} MCQ correct option invalid`);
          else if (!q.options[q.correctOption] || !q.options[q.correctOption].trim()) errs.push(`Section ${si + 1} Q${qi + 1} MCQ correct option is empty`);
        }
        if (q.type === 'msq') {
          if (!Array.isArray(q.options) || q.options.length < 2) errs.push(`Section ${si + 1} Q${qi + 1} MSQ needs 2+ options`);
          const nonEmpty = q.options.filter(o=> (o||'').trim().length>0);
            if (nonEmpty.length < 2) errs.push(`Section ${si + 1} Q${qi + 1} MSQ needs 2+ non-empty options`);
          if (!Array.isArray(q.correctOptions) || !q.correctOptions.length) errs.push(`Section ${si + 1} Q${qi + 1} MSQ needs at least one correct option`);
          else if (q.correctOptions.some(ci => ci <0 || ci >= q.options.length)) errs.push(`Section ${si + 1} Q${qi + 1} MSQ correct option index out of range`);
          else if (q.correctOptions.some(ci => !q.options[ci] || !q.options[ci].trim())) errs.push(`Section ${si + 1} Q${qi + 1} MSQ has correct option with empty text`);
        }
      });
    });
    return errs;
  };

  const saveRemote = async () => {
    setSaving(true); setSaveMsg('');
    try {
      const errs = validate();
      if (errs.length) { setSaveMsg(`Validation: ${errs[0]} (+${errs.length - 1} more)`); setSaving(false); return; }
      const transform = (t) => ({
        title: t.title,
        sections: t.sections.map(s => ({
          sectionId: s.sectionId,
            title: s.title,
            questionsToDisplay: s.questionsToDisplay,
            questions: s.questions.map(q => {
              const base = {
                questionNumber: q.questionNumber,
                type: q.type === 'open' ? 'open-ended' : q.type,
                questionText: q.questionText,
                successMarks: q.successMarks,
              };
              if (q.type === 'open') {
                return {
                  ...base,
                  failureMarks: q.failureMarks ?? 0,
                  modelAnswer: q.modelAnswer || ''
                };
              }
              if (q.type === 'msq') {
                return {
                  ...base,
                  options: q.options,
                  // convert 0-based -> 1-based for persistence
                  correctOptions: Array.isArray(q.correctOptions) ? q.correctOptions.filter(v=> typeof v==='number' && v>=0).map(v=> v+1) : [],
                  failureMarks: q.failureMarks ?? -1
                };
              }
              // mcq
              return {
                ...base,
                options: q.options,
                // convert 0-based -> 1-based; if unset (-1) keep as -1 to signal invalid until user fixes
                correctOption: typeof q.correctOption === 'number' && q.correctOption >= 0 ? (q.correctOption + 1) : -1,
                failureMarks: q.failureMarks ?? -1
              };
            })
        }))
      });
      const payload = { test_id: Number(id), test: transform(draft) };
      await apiPut('/api/test/update-que-ans', payload, { token });
      setSaveMsg('Saved to server');
      setDirty(false);
    } catch (e) {
      console.error(e); setSaveMsg(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); setTimeout(() => setSaveMsg(''), 4000); }
  };

  if (loading) return <div className="container py-4">Loading…</div>;
  if (error) return <div className="container py-4"><div className="alert alert-danger">{error}</div></div>;

  // Local image uploader modal (stores base64 images in localStorage)
  function UploaderModal({ onClose, onInsert, hasQuestionSelected }) {
    // Store remote uploads metadata: {id,name,url,ts}
    const [items, setItems] = useState(() => {
      try { return JSON.parse(localStorage.getItem('qs-uploaded-images') || '[]'); } catch { return []; }
    });
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [uploadingNames, setUploadingNames] = useState([]);

    const persist = (arr) => {
      localStorage.setItem('qs-uploaded-images', JSON.stringify(arr));
      setItems(arr);
    };

    const handleFiles = async (e) => {
      const files = Array.from(e.target.files||[]);
      if (!files.length) return;
      setBusy(true); setErr('');
      try {
        for (const f of files) {
          setUploadingNames(prev => [...prev, f.name]);
          const form = new FormData();
          form.append('file', f);
          try {
            const res = await apiPost('/api/upload-image', form, { token, headers: { 'Content-Type': 'multipart/form-data' }});
            const data = res?.data;
            if (data && data.url) {
              const record = { id: Date.now().toString()+Math.random().toString(36).slice(2), name: f.name, url: data.url, filename: data.filename, ts: Date.now() };
              persist([record, ...items].slice(0,300));
            }
          } catch (ex) {
            console.error('Upload failed', ex);
            setErr(ex?.response?.data?.message || ex.message || 'Upload failed');
          } finally {
            setUploadingNames(prev => prev.filter(n => n!==f.name));
          }
        }
      } finally {
        setBusy(false);
        e.target.value='';
      }
    };

    const removeItem = (id) => {
      const next = items.filter(i=> i.id!==id);
      persist(next);
    };

    const copyLink = (url) => { navigator.clipboard.writeText(url).catch(()=>{}); };
    const copyMarkdown = (name,url) => { navigator.clipboard.writeText(`![${name}](${url})`).catch(()=>{}); };

    return (
      
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2500, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div className="surface p-3 rounded-3 d-flex flex-column" style={{ width:'min(700px,95vw)', maxHeight:'92vh', border:'1px solid var(--border)' }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h3 className="h6 m-0">Uploaded Images (Remote links)</h3>
            <div className="d-flex gap-2">
              <label className="btn btn-sm btn-outline-primary mb-0">
                {busy ? 'Uploading…' : 'Upload'}
                <input type="file" accept="image/*" multiple hidden disabled={busy} onChange={handleFiles} />
              </label>
              <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Close</button>
            </div>
          </div>
          {err && <div className="alert alert-danger py-1 small mb-2">{err}</div>}
          <div className="small mb-2" style={{ color:'var(--muted)' }}>{items.length} item(s). Only names & URLs shown (images not rendered).</div>
          <div className="overflow-auto" style={{ flex:1, border:'1px solid var(--border)', borderRadius:6 }}>
            <table className="table table-sm table-borderless align-middle mb-0" style={{ fontSize:12 }}>
              <thead style={{ position:'sticky', top:0, background:'var(--bs-body-bg)' }}>
                <tr><th style={{ width:'40%' }}>Name</th><th>Filename</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id}>
                    <td className="text-truncate" title={it.name}>{it.name}</td>
                    <td className="text-truncate" title={it.filename || it.url}>{(it.filename||'').slice(0,40) || '—'}</td>
                    <td className="d-flex flex-wrap gap-1">
                      <button className="btn btn-xs btn-outline-secondary" onClick={()=> copyLink(it.url)}>Copy Link</button>
                      <button className="btn btn-xs btn-outline-secondary" onClick={()=> copyMarkdown(it.name, it.url)}>MD</button>
                      {hasQuestionSelected && <button className="btn btn-xs btn-outline-primary" onClick={()=> onInsert(it.url)}>Insert</button>}
                      <button className="btn btn-xs btn-outline-danger" onClick={()=> removeItem(it.id)}>Del</button>
                    </td>
                  </tr>
                ))}
                {uploadingNames.map(n => (
                  <tr key={n}><td colSpan={3} className="text-muted">Uploading {n}…</td></tr>
                ))}
                {items.length===0 && uploadingNames.length===0 && <tr><td colSpan={3} className="text-muted">No images uploaded yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="small mt-2" style={{ color:'var(--muted)' }}>Use Link or MD buttons to copy, Insert to append to selected question text.</div>
        </div>
      </div>
    );
  }

  // Generic image insertion (question or option)
  const insertImage = (url) => {
    if (!selected.sectionId || !selected.questionNumber) return;
    mutate(prev => ({
      ...prev,
      sections: prev.sections.map(s => {
        if (s.sectionId !== selected.sectionId) return s;
        return {
          ...s,
          questions: s.questions.map(q => {
            if (q.questionNumber !== selected.questionNumber) return q;
            const md = `![image](${url})`;
            if (uploaderTarget.kind === 'option' && uploaderTarget.optionIndex != null) {
              const opts = [...q.options];
              if (opts[uploaderTarget.optionIndex] != null) {
                opts[uploaderTarget.optionIndex] = (opts[uploaderTarget.optionIndex] ? opts[uploaderTarget.optionIndex] + ' ' : '') + md;
              }
              return { ...q, options: opts };
            }
            return { ...q, questionText: (q.questionText ? q.questionText + '\n' : '') + md };
          })
        };
      })
    }));
  };

  return (
    <div style={{ color: 'var(--text)' }}>
      <Navbar />
      <div className="exam-layout">
      {/* Sidebar */}
      <aside className="exam-sidebar">
        <div className="d-flex align-items-center justify-content-between mb-1">
          <h2 className="h6 m-0">Exam #{id}</h2>
          <button className="btn btn-sm btn-outline-primary" onClick={addSection}>+ Sec</button>
        </div>
        <div className="small mb-2" style={{ color: 'var(--muted)' }}>{derived.totalQuestions} questions • {derived.totalMarks} marks {dirty && <span className="ms-1">(draft)</span>}</div>
        <div className="vstack gap-2 section-list">
            {draft.sections.map(sec => (
              <div key={sec.sectionId} className="border rounded-3" style={{ borderColor: 'var(--border)' }}>
                <div className={`d-flex align-items-center justify-content-between px-2 py-1 ${selected.sectionId===sec.sectionId && selected.questionNumber==null ? 'bg-primary text-white rounded-top-3' : ''}`}
                     role="button"
                     onClick={()=> setSelected({ sectionId: sec.sectionId, questionNumber: null })}>
                  <span className="text-truncate" style={{ fontSize: '0.8rem' }}>{sec.title || `Section ${sec.sectionId}`}</span>
                  <div className="d-flex gap-1">
                    <button className="btn btn-xs btn-outline-secondary py-0 px-1" style={{ fontSize: '0.65rem' }} onClick={(e)=> { e.stopPropagation(); addQuestion(sec.sectionId,'mcq'); }}>+Q</button>
                    <button className="btn btn-xs btn-outline-danger py-0 px-1" style={{ fontSize: '0.65rem' }} onClick={(e)=> { e.stopPropagation(); deleteSection(sec.sectionId); }}>✕</button>
                  </div>
                </div>
                {sec.questions.length>0 && (
                  <div className="list-group list-group-flush">
                    {sec.questions.map(q => (
                      <button key={q.questionNumber} className={`list-group-item list-group-item-action py-1 px-2 ${selected.sectionId===sec.sectionId && selected.questionNumber===q.questionNumber ? 'active' : ''}`}
                        style={{ fontSize: '0.7rem' }} onClick={()=> setSelected({ sectionId: sec.sectionId, questionNumber: q.questionNumber })}>
                        Q{q.questionNumber}: {(q.questionText||'').slice(0,30) || <span className="text-muted">(empty)</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {draft.sections.length===0 && <div className="text-muted small">No sections</div>}
        </div>
        <div className="mt-auto d-flex flex-column gap-2 pt-2 border-top" style={{ borderColor:'var(--border)' }}>
          <button className="btn btn-sm btn-outline-secondary" onClick={()=> { setJsonText(JSON.stringify(draft,null,2)); setShowJson(true); }}>JSON</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={()=> { setUploaderTarget({ kind:'question', optionIndex:null }); setUploader(true); }}>Images</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={()=> navigate(`/exam/manageCandidates?test_id=${encodeURIComponent(id)}`)}>Candidates</button>
          <button className="btn btn-sm btn-outline-secondary" disabled={reloading} onClick={handleReload}>{reloading? 'Reloading…':'Reload Server'}</button>
          <button className="btn btn-sm btn-primary" disabled={saving || !dirty} onClick={saveRemote}>{saving? 'Saving…' : 'Save Server'}</button>
          {saveMsg && <div className="small" style={{ color: /fail|error/i.test(saveMsg)? 'var(--bs-danger)' : 'var(--muted)' }}>{saveMsg}</div>}
        </div>
      </aside>
      {/* Main editor */}
      <div className="exam-main">
          <div className="surface rounded-3 p-3 mb-3" style={{ border: '1px solid var(--border)' }}>
            <label className="form-label small mb-1">Test Title</label>
            <input className="form-control form-control-sm" value={draft.title} onChange={(e)=> mutate(prev => ({ ...prev, title: e.target.value }))} />
          </div>
          {/* Section level editing when section selected and no question selected */}
          {selected.sectionId && !selected.questionNumber && (() => {
            const sec = draft.sections.find(s => s.sectionId===selected.sectionId);
            if (!sec) return null;
            return (
              <div className="surface rounded-3 p-3 mb-3" style={{ border:'1px solid var(--border)' }}>
                <h3 className="h6 mb-3">Edit Section {sec.sectionId}</h3>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small">Title</label>
                    <input className="form-control form-control-sm" value={sec.title} onChange={(e)=> updateSectionTitle(sec.sectionId, e.target.value)} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small">Questions To Display</label>
                    <input type="number" min={0} className="form-control form-control-sm" value={sec.questionsToDisplay} onChange={(e)=> updateSectionQty(sec.sectionId, parseInt(e.target.value||'0',10))} />
                  </div>
                  <div className="col-md-3 d-flex align-items-end">
                    <div className="btn-group btn-group-sm w-100">
                      <button className="btn btn-outline-secondary" disabled={draft.sections.findIndex(s=> s.sectionId===sec.sectionId)===0} onClick={()=> moveSection(sec.sectionId,'up')}>↑</button>
                      <button className="btn btn-outline-secondary" disabled={draft.sections.findIndex(s=> s.sectionId===sec.sectionId)===draft.sections.length-1} onClick={()=> moveSection(sec.sectionId,'down')}>↓</button>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Dropdown>
                    <Dropdown.Toggle size="sm" variant="outline-primary">Add Question</Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={()=> addQuestion(sec.sectionId,'mcq')}>MCQ</Dropdown.Item>
                      <Dropdown.Item onClick={()=> addQuestion(sec.sectionId,'msq')}>MSQ</Dropdown.Item>
                      <Dropdown.Item onClick={()=> addQuestion(sec.sectionId,'open')}>Open</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>
            );
          })()}
          {/* Question editor */}
          {selected.sectionId && selected.questionNumber && (() => {
            const sec = draft.sections.find(s => s.sectionId===selected.sectionId); if (!sec) return null;
            const q = sec.questions.find(q => q.questionNumber===selected.questionNumber); if (!q) return null;
            return (
              <div className="surface rounded-3 p-3" style={{ border:'1px solid var(--border)' }}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h3 className="h6 m-0">Section {sec.sectionId} • Question {q.questionNumber}</h3>
                  <div className="d-flex gap-2">
                    <select className="form-select form-select-sm" value={q.type} onChange={(e)=> changeQuestionType(sec.sectionId, q.questionNumber, e.target.value)}>
                      <option value="mcq">MCQ</option>
                      <option value="msq">MSQ</option>
                      <option value="open">Open</option>
                    </select>
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-secondary" disabled={q.questionNumber===1} onClick={()=> moveQuestion(sec.sectionId, q.questionNumber,'up')}>↑</button>
                      <button className="btn btn-outline-secondary" disabled={q.questionNumber===sec.questions.length} onClick={()=> moveQuestion(sec.sectionId, q.questionNumber,'down')}>↓</button>
                    </div>
                    <button className="btn btn-sm btn-outline-danger" onClick={()=> deleteQuestion(sec.sectionId, q.questionNumber)}>Delete</button>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-8">
                    <div className="d-flex justify-content-between align-items-center">
                      <label className="form-label small mb-0">Question Text</label>
                      <button type="button" className="btn btn-xs btn-outline-secondary" onClick={()=> { setUploaderTarget({ kind:'question', optionIndex:null }); setUploader(true); }}>Insert Image</button>
                    </div>
                    <textarea className="form-control" rows={3} value={q.questionText} onChange={(e)=> updateQuestion(sec.sectionId, q.questionNumber,{ questionText: e.target.value })} />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small">+ Marks</label>
                    <input type="number" className="form-control form-control-sm" value={q.successMarks} onChange={(e)=> updateQuestion(sec.sectionId, q.questionNumber,{ successMarks: parseFloat(e.target.value||'0') })} />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small">- Marks</label>
                    <input type="number" className="form-control form-control-sm" value={q.failureMarks} onChange={(e)=> updateQuestion(sec.sectionId, q.questionNumber,{ failureMarks: parseFloat(e.target.value||'0') })} />
                  </div>
                </div>
                {q.type==='open' && (
                  <div className="mb-3">
                    <label className="form-label small">Model Answer</label>
                    <textarea className="form-control" rows={2} value={q.modelAnswer||''} onChange={(e)=> updateQuestion(sec.sectionId, q.questionNumber,{ modelAnswer: e.target.value })} />
                  </div>
                )}
                {(q.type==='mcq' || q.type==='msq') && (
                  <div className="mb-3">
                    <label className="form-label small d-block mb-2">Options</label>
                    <div className="vstack gap-2">
                      {q.options.map((opt,oIdx)=>(
                        <div key={oIdx} className="d-flex gap-2 align-items-center">
                          <div className="flex-grow-1 d-flex gap-1">
                            <input className="form-control form-control-sm" value={opt} placeholder={`Option ${oIdx+1}`} onChange={(e)=> { const newOpts=[...q.options]; newOpts[oIdx]=e.target.value; updateQuestion(sec.sectionId,q.questionNumber,{ options:newOpts }); }} />
                            <button type="button" className="btn btn-xs btn-outline-secondary" title="Insert image link" onClick={()=> { setUploaderTarget({ kind:'option', optionIndex:oIdx }); setUploader(true); }}>Img</button>
                          </div>
                          {q.type==='mcq' && (
                            <input type="radio" name={`correct-${sec.sectionId}-${q.questionNumber}`} checked={q.correctOption===oIdx} onChange={()=> updateQuestion(sec.sectionId, q.questionNumber,{ correctOption:oIdx })} />
                          )}
                          {q.type==='msq' && (
                            <input type="checkbox" checked={Array.isArray(q.correctOptions)&&q.correctOptions.includes(oIdx)} onChange={(e)=> { let next = Array.isArray(q.correctOptions)? [...q.correctOptions]:[]; if(e.target.checked){ if(!next.includes(oIdx)) next.push(oIdx);} else { next = next.filter(i=> i!==oIdx); } updateQuestion(sec.sectionId, q.questionNumber,{ correctOptions: next }); }} />
                          )}
                          {q.options.length > 2 && (
                            <button className="btn btn-xs btn-outline-danger" title="Remove option" onClick={()=> {
                              const newOpts = q.options.filter((_,i)=> i!==oIdx);
                              let patch = { options: newOpts };
                              if (q.type==='mcq' && q.correctOption === oIdx) {
                                patch.correctOption = -1; // unset
                              } else if (q.type==='mcq' && q.correctOption > oIdx) {
                                patch.correctOption = q.correctOption - 1; // shift after removal
                              }
                              if (q.type==='msq') {
                                if (Array.isArray(q.correctOptions)) {
                                  let next = q.correctOptions.filter(ci=> ci!==oIdx).map(ci=> ci>oIdx? ci-1: ci);
                                  patch.correctOptions = next;
                                }
                              }
                              updateQuestion(sec.sectionId, q.questionNumber, patch);
                            }}>✕</button>
                          )}
                        </div>
                      ))}
                      <div>
                        <button className="btn btn-xs btn-outline-primary" onClick={()=> {
                          const newOpts=[...q.options, ''];
                          updateQuestion(sec.sectionId, q.questionNumber,{ options:newOpts });
                        }}>+ Add Option</button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Future: explanations, tags, difficulty */}
              </div>
            );
          })()}
        </div>{/* end exam-main */}
      </div>{/* end exam-layout */}
      {showJson && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="surface p-3 rounded-3" style={{ width: 'min(900px,94vw)', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h3 className="h6 m-0">Raw JSON Draft</h3>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowJson(false)}>Close</button>
                <button className="btn btn-sm btn-primary" onClick={applyJson}>Apply</button>
              </div>
            </div>
            {jsonErr && <div className="alert alert-danger py-1 small mb-2">{jsonErr}</div>}
            <textarea className="form-control flex-grow-1" style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 300 }} value={jsonText} onChange={(e) => { setJsonText(e.target.value); setJsonErr(''); }} />
            <div className="small mt-2" style={{ color: 'var(--muted)' }}>Edit the full structure. Ensure sections[].questions[] conform to expected shapes.</div>
          </div>
        </div>
      )}
      {uploader && (
        <UploaderModal
          onClose={()=> setUploader(false)}
          onInsert={(url)=> { insertImage(url); setUploader(false); }}
          hasQuestionSelected={!!(selected.sectionId && selected.questionNumber)}
        />
      )}
    </div>
  );
}

