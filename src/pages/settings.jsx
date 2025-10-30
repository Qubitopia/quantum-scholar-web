import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/navbar.jsx';
import { useTheme } from '../common/theme.jsx';
import { FiUser, FiBell, FiLock, FiMonitor, FiCreditCard, FiSliders } from 'react-icons/fi';
import { TfiPlug } from "react-icons/tfi";
import { getCookie, setCookie, deleteCookie } from '../common/cookie.js';
import { apiPut, apiPost, apiGet } from '../common/api.js';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../common/appUtils.js';

const sections = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'billing', label: 'Billing', icon: FiCreditCard },
    { id: 'appearance', label: 'Appearance', icon: FiMonitor },
    { id: 'advanced', label: 'Advanced', icon: FiSliders },
];
const limitedSections = [
    { id: 'appearance', label: 'Appearance', icon: FiMonitor },
    { id: 'advanced', label: 'Advanced', icon: FiSliders },
];

async function loadData(token) {
    const { data } = await apiGet('/api/profile', { token });
    setCookie('qs-user', JSON.stringify(data.user), { days: 7 });
    console.log(data);
    return data.user;
}

function Sidebar({ items, active, onSelect }) {
    return (
        <aside style={{
            width: 260,
            borderRight: '1px solid var(--border)',
            padding: '1rem',
            display: 'none'
        }} className="d-none d-md-block">
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>USER SETTINGS</div>
            <nav style={{ display: 'grid', gap: 6 }}>
                {items.map(({ id, label, icon: Icon }) => {
                    const selected = id === active;
                    return (
                        <button key={id} onClick={() => onSelect(id)}
                            style={{
                                textAlign: 'left',
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '0.6rem 0.75rem',
                                borderRadius: 8,
                                border: '1px solid var(--border)',
                                background: selected ? 'color-mix(in srgb, var(--bg-elev) 92%, transparent)' : 'transparent',
                                color: 'var(--text)',
                                cursor: 'pointer'
                            }}>
                            {Icon ? <Icon size={16} /> : null}
                            <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}

function MobileSectionPicker({ items, active, onSelect }) {
    return (
        <div className="d-md-none" style={{
            borderBottom: '1px solid var(--border)',
            padding: '0.75rem 1rem',
            background: 'var(--bg-elev)'
        }}>
            <label htmlFor="section" style={{ fontSize: 12, color: 'var(--muted)' }}>
                Settings section
            </label>
            <select id="section" value={active} onChange={(e) => onSelect(e.target.value)} className="form-select mt-1">
                {items.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                ))}
            </select>
        </div>
    );
}

function AppearancePanel() {
    const { mode, theme, setMode } = useTheme();
    return (
        <section>
            <h2 className="h5 fw-bold mb-3">Appearance</h2>
            <p style={{ color: 'var(--muted)' }}>Choose how QuantumScholar looks on this device.</p>
            <div style={{ marginTop: 12, maxWidth: 320 }}>
                <label className="form-label">Theme</label>
                <select
                    className="form-select"
                    style={{ width: 160 }}
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}>
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
            </div>
            {/* linebreak */}
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
            <small style={{ color: 'var(--muted)' }}>Applied: {theme}</small>
        </section>
    );
}

function ProfilePanel({ user, onUserUpdate }) {
    const navigate = useNavigate();
    const [update,setUpdate] = useState(false);
    const logout = async () => {
        onUserUpdate && onUserUpdate(null);
        navigate('/', { replace: true });
        deleteCookie('qs-user', { path: '/' });
        deleteCookie('qs-token', { path: '/' });
        localStorage.removeItem('qs-user');

    };

    return (
        useEffect(() => {
            user=getCookie
        }, []),
        <section>
            <h2 className="h5 fw-bold mb-3">Profile</h2>
            {user ? (
                <div className="row g-3">
                    <div className="col-md-6">
                        <label className="form-label">Name</label>
                        <input className="form-control" value={user.name} disabled/>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Email</label>
                        <input className="form-control" value={user.email} disabled />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">User ID</label>
                        <input className="form-control" value={user.id ?? ''} disabled />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Birthdate</label>
                        <input className="form-control" value={new Date(user.birth_date).toLocaleDateString('en-US',{dateStyle: 'medium'})} disabled/>
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">QS Coins</label>
                        <input className="form-control" value={user.qs_coins ?? 0} disabled />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Created At</label>
                        <input className="form-control" value={new Date(user.created_at).toLocaleDateString('en-US',{dateStyle: 'medium'})} disabled />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Updated At</label>
                        <input className="form-control" value={new Date(user.updated_at).toLocaleDateString('en-US',{dateStyle: 'medium'})} disabled />
                    </div>
                    <div className="col-12 d-flex align-items-center gap-2 mt-2">
                        <span className="ms-auto" />
                        <button className="btn btn-primary">Edit</button>
                        <button className="btn btn-outline-secondary" onClick={logout}>Log out</button>
                    </div>
                </div>
            ) : (
                <p style={{ color: 'var(--muted)' }}>You are not logged in. Please sign in to manage your profile.</p>
            )}
            
        {(() => {
            function EditProfileModal() {
                const [name, setName] = useState(user?.name || '');
                const [birth, setBirth] = useState(() => {
                    const d = user?.birth_date ? new Date(user.birth_date) : null;
                    return d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '';
                });
                const [saving, setSaving] = useState(false);
                const [err, setErr] = useState('');

                useEffect(() => {
                    const sectionEl = document.getElementById('profile-edit-anchor')?.closest('section');
                    if (!sectionEl) return;
                    const btns = Array.from(sectionEl.querySelectorAll('button'));
                    const editBtn = btns.find(b => (b.textContent || '').trim().toLowerCase() === 'edit');
                    if (!editBtn) return;
                    const handler = (e) => { e.preventDefault(); setUpdate(true); };
                    editBtn.addEventListener('click', handler);
                    return () => editBtn.removeEventListener('click', handler);
                }, []);

                useEffect(() => {
                    if (update) {
                        setName(user?.name || '');
                        const d = user?.birth_date ? new Date(user.birth_date) : null;
                        const yyyyMMdd = d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '';
                        setBirth(yyyyMMdd);
                        setErr('');
                    }
                }, [update, user]);

                const save = async (e) => {
                    e.preventDefault();
                    setSaving(true);
                    setErr('');
                    try {
                        const token = getCookie('qs-token');
                        await apiPut('/api/profile', { name, birth_date: birth }, { token });
                        await loadData(token).then((profile) => {
                            if (profile) {
                                const serialized = JSON.stringify(profile);
                                setCookie('qs-user', serialized, { days: 7, path: '/' });
                                localStorage.setItem('qs-user', serialized);
                                onUserUpdate && onUserUpdate(profile);
                            }
                        });
                        setUpdate(false);
                    } catch (e) {
                        setErr(e?.response?.data?.message || e.message || 'Failed to update profile');
                    } finally {
                        setSaving(false);
                    }
                };

                if (!update) return <span id="profile-edit-anchor" />;

                return (
                    <>
                        <div
                            onClick={() => setUpdate(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.45)',
                                zIndex: 1040
                            }}
                        />
                        <div
                            role="dialog"
                            aria-modal="true"
                            style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                background: 'var(--bg-elev)',
                                color: 'var(--text)',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                padding: '1rem',
                                width: 'min(520px, 92vw)',
                                zIndex: 1041,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h3 className="h6 m-0">Edit profile</h3>
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => setUpdate(false)}>Close</button>
                            </div>
                            <form onSubmit={save} className="d-grid gap-2">
                                <div>
                                    <label className="form-label">Name</label>
                                    <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="form-label">Birthdate</label>
                                    <input type="date" className="form-control" value={birth} onChange={(e) => setBirth(e.target.value)} required />
                                </div>
                                {err && <div className="text-danger">{err}</div>}
                                <div className="d-flex gap-2 justify-content-end">
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setUpdate(false)} disabled={saving}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                                </div>
                            </form>
                        </div>
                    </>
                );
            }

            return <EditProfileModal />;
        })()}
        </section>
    );
}

function BillingPanel({ user, onUserUpdate }) {
    const [coinsToBuy, setCoinsToBuy] = useState(50);
    const [loading, setLoading] = useState(false);
    const [currency, setCurrency] = useState('/api/purchase-qscoins-inr');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const RZP_KEY_ID = import.meta.env.VITE_RZP_KEY_ID;
    const token = getCookie('qs-token');
    const [orders, setOrders] = useState([]);

    const fetchOrders = async () => {
        try {
            const res = await apiGet('/api/orders', { token });
            console.log("Fetched orders:", res.data.orders);
            setOrders(res.data.orders);
            
        } catch (e) {
            setOrders([]);
            console.error('Error fetching orders:', e);
        }
    };

    const handleBuy = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const amountCoins = Number(coinsToBuy);
        if (!user) {
            setError('Please log in to purchase coins.');
            return;
        }
        if (!amountCoins || amountCoins < 1) {
            setError('Enter a valid coin amount (1 or more).');
            return;
        }
        try {
            setLoading(true);
            const key = (RZP_KEY_ID || '').trim();
            if (!key) {
                setError('Missing Razorpay Key ID. Set VITE_RZP_KEY_ID in frontend/.env and restart dev server.');
                setLoading(false);
                return;
            }

            const orderRes = await apiPost(currency, { qscoins: amountCoins }, { token });
            console.log("currency:", currency, "order currency:", orderRes.data);
            const orderId = orderRes.data.razorpay_order_id;
            if (!orderId) throw new Error('No order id returned by server');

            const options = {
                key,
                amount: orderRes.data.amount,
                currency: orderRes.data.currency,
                name: 'QuantumScholar',
                description: 'QS Coins purchase',
                order_id: orderId,
                prefill: {
                    name: user?.Name,
                    email: user?.public_email,
                },
                theme: { color: '#2e6da4' },
                handler: async function (response) {
                    try {
                        await apiPost('/api/verify-razorpay-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        }, { token });
                        fetchOrders();
                        await loadData(token).then(profileRes => {
                            console.log(profileRes);
                            if (profileRes) {
                                const serialized = JSON.stringify(profileRes);
                                setCookie('qs-user', serialized, { days: 7, path: '/' });
                                localStorage.setItem('qs-user', serialized);
                                onUserUpdate && onUserUpdate(profileRes);
                            }
                        });

                        setSuccess('Payment verified and coins credited.');
                    } catch (err) {
                        setError(err?.response?.data?.message || err.message || 'Verification failed');
                    }
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            setError(err?.response?.data?.message || err.message || 'Purchase failed');
        } finally {
            setLoading(false);
        }
    };

    const statusBadge = (s) => {
        const lower = String(s || '').toLowerCase();
        const color = lower === 'completed' ? 'success' : lower === 'pending' ? 'warning' : 'secondary';
        return <span className={`badge bg-${color}`}>{s}</span>;
    };

    useEffect(() => {
        if (!loading) {
            fetchOrders();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    return (
        <section>

            <h2 className="h5 fw-bold mb-3">Billing</h2>
            <p style={{ color: 'var(--muted)' }}>Buy QS Coins and see your recent transactions.</p>

            <div className="surface rounded-3 p-3 mb-3" style={{ border: '1px solid var(--border)' }}>
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <div className="fw-semibold">Current balance</div>
                        <div style={{ color: 'var(--muted)' }}>{user?.qs_coins ?? 0} QS Coins</div>
                    </div>
                    {!user && (
                        <a className="btn btn-outline-primary" href="/login">Log in to buy</a>
                    )}
                </div>
            </div>

            <form className="surface rounded-3 p-3 mb-4" style={{ border: '1px solid var(--border)' }} onSubmit={handleBuy}>
                <div className="row g-3 align-items-end">
                    <div className="col-sm-4">
                        <label className="form-label">QS Coins to buy</label>
                        <input type="number" min={1} className="form-control" value={coinsToBuy}
                            onChange={(e) => setCoinsToBuy(parseInt(e.target.value || '0', 10))} />
                    </div>
                    <div className="col-sm-3">
                        <label className="form-label">Currency</label>
                        <select className="form-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                            <option value="/api/purchase-qscoins-inr">INR (Razorpay)</option>
                            <option value="/api/purchase-qscoins-usd">USD (Razorpay)</option>
                        </select>
                    </div>
                </div>
                <div className="d-flex gap-2 mt-3">
                    <button type="submit" className="btn btn-primary" disabled={loading || !user}>
                        {loading ? 'Processing…' : 'Buy with Razorpay'}
                    </button>
                </div>
                {error && <div className="text-danger mt-2">{error}</div>}
                {success && <div className="text-success mt-2">{success}</div>}
            </form>

            {/* Recent orders */}
            <div style={{ marginTop: 8 }}>
                <h3 className="h6 fw-semibold mb-2">Recent orders</h3>

                {!orders || orders.length === 0 ? (
                    <div style={{ color: 'var(--muted)' }}>No orders found.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-sm align-middle">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>QS Coins</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(o => (
                                    <tr key={o.order_id}>
                                        <td>#{o.order_id}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(o.date_time)}</td>
                                        <td>{o.amount} {o.currency}</td>
                                        <td>{o.qs_coins_purchased}</td>
                                        <td>{statusBadge(o.payment_status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}

function AdvancedPanel() {
    return (
        <section>
            <h2 className="h5 fw-bold mb-3">Advanced</h2>
            <button className="btn btn-outline-danger">Clear cached data</button>
        </section>
    );
}

const panelMap = {
    profile: ProfilePanel,
    billing: BillingPanel,
    appearance: AppearancePanel,
    advanced: AdvancedPanel,
};

const Settings = () => {
    const [user, setUser] = useState(() => {
        const raw = getCookie('qs-user');
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    });
    const [isLoggedIn, setIsLoggedIn] = useState(() => !!getCookie('qs-user'));
    const [active, setActive] = useState(() => (getCookie('qs-user') ? 'profile' : 'appearance'));
    const Panel = useMemo(() => panelMap[active] ?? AppearancePanel, [active]);

    // Read user cookie on mount and when window regains focus
    useEffect(() => {
        const updateFromCookie = () => {
            const raw = getCookie('qs-user');
            if (!raw) {
                setUser(null);
                setIsLoggedIn(false);
                return;
            }
            try {
                const parsed = JSON.parse(raw);
                setUser(parsed);
                setIsLoggedIn(true);
            } catch {
                // Not JSON? Consider any value as logged in flag
                setUser(null);
                setIsLoggedIn(true);
            }
        };
        updateFromCookie();
        window.addEventListener('focus', updateFromCookie);
        return () => window.removeEventListener('focus', updateFromCookie);
    }, []);

    const availableSections = isLoggedIn ? sections : limitedSections;

    // Ensure active section is always valid for current availability
    useEffect(() => {
        if (!availableSections.find(s => s.id === active)) {
            setActive(availableSections[0]?.id || 'appearance');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn]);

    return (
        <div style={{ minHeight: '100vh', width: '100vw', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <Sidebar items={availableSections} active={active} onSelect={setActive} />

                <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <MobileSectionPicker items={availableSections} active={active} onSelect={setActive} />
                    <div className="container-fluid" style={{ padding: '1rem' }}>
                        <div className="surface shadow-soft rounded-4 p-4 p-md-5" style={{ width: '100%', border: '1px solid var(--border)' }}>
                            <Panel user={user} onUserUpdate={setUser} />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Settings;