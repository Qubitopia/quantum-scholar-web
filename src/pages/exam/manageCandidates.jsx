import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiGet, apiPost } from '../../common/api.js';
import { getCookie } from '../../common/cookie.js';

// Utility to read query param
function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function ManageCandidates() {
  const token = getCookie('qs-token');
  const navigate = useNavigate();
  const query = useQuery();
  const testId = query.get('test_id');

  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [emailsText, setEmailsText] = useState('');
  const [attempts, setAttempts] = useState(1);
  const [savingMsg, setSavingMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);

  const load = async () => {
    setRefreshing(true);
    try {
      setErr('');
      const res = await apiGet(`/api/test/${encodeURIComponent(testId)}/candidates`, { token });
      setCandidates(res?.data?.candidates || []);
    } catch (e) {
      console.error(e); setErr(e?.response?.data?.message || e.message || 'Load failed');
    } finally {
      setRefreshing(false); setLoading(false);
    }
  };

  useEffect(()=> {
    if (!token) { navigate('/login'); return; }
    if (!testId) { navigate('/exam/manageExam'); return; }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, token]);

  const addCandidates = async () => {
    const emails = emailsText.split(/[,\n]/).map(e => e.trim()).filter(e => e);
    if (!emails.length) { setSavingMsg('No valid emails'); return; }
    setAdding(true); setSavingMsg('');
    try {
      await apiPost('/api/test/add-candidates', { test_id: Number(testId), number_of_attempts: attempts, candidate_emails: emails }, { token });
      setSavingMsg(`Added ${emails.length} candidate(s)`);
      setEmailsText('');
      await load();
    } catch (e) {
      console.error(e); setSavingMsg(e?.response?.data?.message || 'Add failed');
    } finally {
      setAdding(false); setTimeout(()=> setSavingMsg(''), 4000);
    }
  };

  const removeSelected = async () => {
    if (!selectedEmails.length) return;
    if (!confirm(`Remove ${selectedEmails.length} candidate(s)?`)) return;
    setRemoving(true); setSavingMsg('');
    try {
      await apiPost('/api/test/remove-candidates', { test_id: Number(testId), number_of_attempts: attempts, candidate_emails: selectedEmails }, { token });
      setSavingMsg(`Removed ${selectedEmails.length} candidate(s)`);
      setSelectedEmails([]);
      await load();
    } catch (e) {
      console.error(e); setSavingMsg(e?.response?.data?.message || 'Remove failed');
    } finally {
      setRemoving(false); setTimeout(()=> setSavingMsg(''), 4000);
    }
  };

  const toggleSelect = (email) => {
    setSelectedEmails(prev => prev.includes(email) ? prev.filter(e => e!==email) : [...prev, email]);
  };

  if (loading) return <div className="container py-4">Loading candidates…</div>;

  return (
    <div className="container py-3" style={{ color:'var(--text)' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h6 m-0">Manage Candidates • Test #{testId}</h1>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={()=> navigate(`/exam/editExam?test_id=${encodeURIComponent(testId)}`)}>Back to Test</button>
          <button className="btn btn-sm btn-outline-secondary" disabled={refreshing} onClick={load}>{refreshing? 'Refreshing…':'Refresh'}</button>
        </div>
      </div>
      {err && <div className="alert alert-danger py-2 small">{err}</div>}

      <div className="row g-3">
        <div className="col-md-5">
          <div className="surface p-3 rounded-3 mb-3" style={{ border:'1px solid var(--border)' }}>
            <h2 className="h6">Add Candidates</h2>
            <div className="mb-2 small" style={{ color:'var(--muted)' }}>Enter emails separated by commas or new lines.</div>
            <textarea className="form-control mb-2" rows={5} value={emailsText} onChange={e=> setEmailsText(e.target.value)} placeholder="candidate1@example.com\ncandidate2@example.com" />
            <div className="d-flex gap-2 align-items-end mb-2">
              <div>
                <label className="form-label small mb-1">Attempts</label>
                <input type="number" min={1} className="form-control form-control-sm" value={attempts} onChange={e=> setAttempts(parseInt(e.target.value||'1',10))} />
              </div>
              <button className="btn btn-sm btn-primary mt-auto" disabled={adding} onClick={addCandidates}>{adding? 'Adding…':'Add'}</button>
            </div>
            {savingMsg && <div className="small" style={{ color:/fail|error/i.test(savingMsg)?'var(--bs-danger)':'var(--muted)' }}>{savingMsg}</div>}
          </div>
        </div>
        <div className="col-md-7">
          <div className="surface p-3 rounded-3" style={{ border:'1px solid var(--border)', minHeight:300 }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 className="h6 m-0">Current Candidates ({candidates.length})</h2>
              <button className="btn btn-sm btn-outline-danger" disabled={!selectedEmails.length || removing} onClick={removeSelected}>{removing? 'Removing…': `Remove Selected (${selectedEmails.length})`}</button>
            </div>
            <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
              <table className="table table-sm align-middle" style={{ fontSize:12 }}>
                <thead>
                  <tr>
                    <th style={{width:30}}></th>
                    <th>Email</th>
                    <th style={{width:120}}>Attempts Left</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map(c => (
                    <tr key={c.candidate_email} className={selectedEmails.includes(c.candidate_email)? 'table-primary': ''}>
                      <td><input type="checkbox" checked={selectedEmails.includes(c.candidate_email)} onChange={()=> toggleSelect(c.candidate_email)} /></td>
                      <td>{c.candidate_email}</td>
                      <td>{c.attempt_remaining}</td>
                    </tr>
                  ))}
                  {!candidates.length && <tr><td colSpan={3} className="text-muted">No candidates added yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="small mt-2" style={{ color:'var(--muted)' }}>Select candidates to remove. Attempts value used when adding or removing per API requirements.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
