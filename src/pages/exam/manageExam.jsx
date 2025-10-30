import { useEffect, useState } from 'react';
import Navbar from '../../components/navbar.jsx';
import Footer from '../../components/footer.jsx';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../../common/api.js'; 
import { getCookie } from '../../common/cookie.js';

export default function ManageExam() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [exams, setExams] = useState(() => []);
	// Create Exam modal state
	const [showCreate, setShowCreate] = useState(false);
	const [creating, setCreating] = useState(false);
	const [createError, setCreateError] = useState('');
	const [createForm, setCreateForm] = useState({
		test_name: '',
		test_duration: 60,
		total_marks: 100,
		number_of_questions_per_test: 10,
		test_start_time: 0,
		test_end_time: 0,
	});

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
		apiGet('/api/test', { token })
		  .then(res => setExams(res.data.tests || []))
		  .catch(err => {
			  setError('No Exams Found');
			  console.error(err);
		  })
		  .finally(() => setLoading(false));
	}, [navigate]);

	const goCreate = () => {
		setCreateError('');
		setShowCreate(true);
	};

    const editExam = (examId) => {
    if (!examId) {
        console.error('Invalid exam ID');
        return;
    }
	navigate(`/exam/editExam?test_id=${encodeURIComponent(examId)}`);
    };


	return (
		<div className="min-vh-100 d-flex flex-column" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
			<Navbar />
			<main className="container py-4 flex-grow-1">
				<div className="surface shadow-soft rounded-4 p-4 p-md-5" style={{ border: '1px solid var(--border)' }}>
					<div className="d-flex justify-content-between align-items-center mb-3">
						<h1 className="h4 fw-bold m-0">Manage Exams</h1>
						<button className="btn btn-primary" onClick={goCreate}>Create New Exam</button>
					</div>

					{error && <div className="alert alert-danger">{error}</div>}
					{loading && <div style={{ color: 'var(--muted)' }}>Loading exams…</div>}

					{!loading && exams?.length === 0 && (
						<div style={{ color: 'var(--muted)' }}>No exams found. Click "Create New Exam" to add one.</div>
					)}

					{!loading && exams?.length > 0 && (
						<div className="table-responsive">
							<table className="table align-middle" style={{ color: 'var(--text)' }}>
								<thead>
									<tr>
										<th style={{ width: 90 }}>ID</th>
										<th>Name</th>
										<th style={{ width: 140 }}>Duration</th>
										<th style={{ width: 140 }}>Total Marks</th>
										<th style={{ width: 140 }}>Questions</th>
										<th style={{ width: 180 }}>Start Time</th>
										<th style={{ width: 180 }}>End Time</th>
									</tr>
								</thead>
								<tbody>
									{exams.map((ex) => (
										<tr key={ex.test_id}>
											<td>{ex.test_id}</td>
											<td>{ex.test_name}</td>
											<td>{ex.test_duration}</td>
											<td>{ex.total_marks}</td>
											<td>{ex.number_of_questions_per_test}</td>
											<td>{ex.test_start_time ? new Date(ex.test_start_time).toLocaleString([], { dateStyle:'medium', timeStyle: 'short' }) : '-'}</td>
											<td>{ex.test_end_time ? new Date(ex.test_end_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</td>
											<td className="text-end">
												<button className="btn btn-sm btn-outline-primary" onClick={() => editExam(ex.test_id)}>Edit</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{/* Create Exam Modal */}
					{showCreate && (
						<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
							<div className="surface rounded-4 p-3 p-md-4" style={{ width: 'min(720px, 96vw)', border: '1px solid var(--border)' }}>
								<div className="d-flex justify-content-between align-items-center mb-2">
									<h2 className="h5 m-0">Create Exam</h2>
									<button className="btn btn-sm btn-outline-secondary" onClick={() => setShowCreate(false)} disabled={creating}>Close</button>
								</div>
								{createError && <div className="alert alert-danger py-2">{createError}</div>}
								<form onSubmit={async (e) => {
									e.preventDefault();
									const requiredName = String(createForm.test_name || '').trim();
									if (!requiredName) { setCreateError('Test name is required'); return; }
									try {
										setCreating(true);
										const token = getCookie('qs-token');

										const formatIso = (val) => {
											if (!val) return '';
											// val is expected to be a number (ms) or an ISO string
											const dt = typeof val === 'number' ? new Date(val) : new Date(val);
											// produce "YYYY-MM-DDTHH:mm:ss.0Z" like example: replace milliseconds
											return dt.toISOString().replace(/\.\d{3}Z$/, '.0Z');
										};

										const body = {
											test_name: createForm.test_name,
											test_duration: parseInt(createForm.test_duration, 10),
											total_marks: parseInt(createForm.total_marks, 10),
											number_of_questions_per_test: parseInt(createForm.number_of_questions_per_test, 10),
											test_start_time: formatIso(createForm.test_start_time),
											test_end_time: formatIso(createForm.test_end_time),
										};
										const res = await apiPost('/api/test/create', body, { token });
										const newId = res?.data?.test_id || res?.data?.id;
										if (newId) {
											setExams((prev) => [{ test_id: newId, test_name: body.test_name, test_duration: body.test_duration, total_marks: body.total_marks, number_of_questions_per_test: body.number_of_questions_per_test, test_start_time: body.test_start_time, test_end_time: body.test_end_time }, ...prev]);
										}
										setShowCreate(false);
										// Optional: go to edit
										navigate(`/exam/editExam/?test_id=${encodeURIComponent(newId)}`);
									} catch (err) {
										setCreateError(err?.response?.data?.message || err.message || 'Failed to create test');
									} finally {
										setCreating(false);
									}
								}}>
									<div className="row g-3">
										<div className="col-12">
											<label className="form-label">Test name</label>
											<input className="form-control" value={createForm.test_name} onChange={(e) => setCreateForm((p) => ({ ...p, test_name: e.target.value }))} placeholder="Sample Test" />
										</div>
										<div className="col-md-4">
											<label className="form-label">Duration (min)</label>
											<input type="number" min={1} className="form-control" value={createForm.test_duration} onChange={(e) => setCreateForm((p) => ({ ...p, test_duration: e.target.value }))} />
										</div>
										<div className="col-md-4">
											<label className="form-label">Total marks</label>
											<input type="number" min={1} className="form-control" value={createForm.total_marks} onChange={(e) => setCreateForm((p) => ({ ...p, total_marks: e.target.value }))} />
										</div>
										<div className="col-md-4">
											<label className="form-label">No. of questions</label>
											<input type="number" min={1} className="form-control" value={createForm.number_of_questions_per_test} onChange={(e) => setCreateForm((p) => ({ ...p, number_of_questions_per_test: e.target.value }))} />
										</div>
										<div className="col-md-6">
											<label className="form-label">Test start time</label>
											<input
												type="datetime-local"
												className="form-control"
												value={
													createForm.test_start_time
														? (typeof createForm.test_start_time === 'number'
															? new Date(createForm.test_start_time).toISOString().slice(0, 16)
															: String(createForm.test_start_time).slice(0, 16))
														: ''
												}
												onChange={(e) => {
													const v = e.target.value;
													setCreateForm((p) => ({ ...p, test_start_time: v ? new Date(v).getTime() : 0 }));
												}}
											/>
										</div>
										<div className="col-md-6">
											<label className="form-label">Test end time</label>
											<input
												type="datetime-local"
												className="form-control"
												value={
													createForm.test_end_time
														? (typeof createForm.test_end_time === 'number'
															? new Date(createForm.test_end_time).toISOString().slice(0, 16)
															: String(createForm.test_end_time).slice(0, 16))
														: ''
												}
												onChange={(e) => {
													const v = e.target.value;
													setCreateForm((p) => ({ ...p, test_end_time: v ? new Date(v).getTime() : 0 }));
												}}
											/>
										</div>
									</div>
									<div className="d-flex gap-2 mt-3">
										<button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
										<button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
									</div>
								</form>
							</div>
						</div>
					)}
				</div>
			</main>
			<Footer />
		</div>
	);
}

