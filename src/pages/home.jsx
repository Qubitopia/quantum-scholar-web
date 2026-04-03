import { Link } from 'react-router-dom';
import Navbar from '../components/navbar.jsx';
import Footer from '../components/footer.jsx';
import logo from '../assets/Qubitopia-logo-transparent-1456x1456.png';
import GradientText from '../components/home/GradientText.jsx';
import SpotlightCard from '../components/home/SpotlightCard.jsx';
import ClickSpark from '../components/home/ClickSpark.jsx';
import Aurora from '../components/home/Aurora.jsx';


const Home = () => {

    return (

        <div className="min-vh-100 d-flex flex-column" style={{ background: 'linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 85%, #000) 100%)', color: 'var(--text)' }}>
            <Navbar />

            <ClickSpark
                sparkColor='#fff'
                sparkSize={10}
                sparkRadius={15}
                sparkCount={8}
                duration={400}
            >
                <div className='min-h-screen' style={{ position: 'relative', overflow: 'hidden' }}>
                <Aurora
                    colorStops={["#40ffaa", "#4079ff", "#40ffaa"]}
                    blend={0.5}
                    amplitude={4.0}
                    speed={0.2}
                />
                <section className="py-5 py-lg-6 d-flex align-items-center" style={{ flex: 1 }}>

                    <div className="container text-center d-flex flex-column align-items-center justify-content-center">
                        <div className="mx-auto mb-4" style={{ width: 160, height: 160 }}>
                            <img src={logo} alt="QuantumScholar Logo" style={{ width: '100%', height: '100%' }} />
                        </div>

                        <GradientText
                            colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                            animationSpeed={3}
                            showBorder={false}
                            className="display-5 fw-bold mb-3 gradient-text "
                        >
                            QuantumScholar Exams
                        </GradientText>
                        <p className="lead mx-auto" style={{ maxWidth: 720, color: 'var(--muted)' }}>
                            Take proctored exams with confidence. Create assessments with a clear, manual question editor for teachers and admins.
                        </p>

                        {/* Primary CTAs */}

                        <div className="d-flex justify-content-center gap-3 mt-4 flex-nowrap">
                            <Link to="/examPortal/viewExam" className="btn w-50 btn-primary rounded-pill px-4 py-3">
                                Give Exam
                            </Link>
                            <Link to="/exam/manageExam" className="btn w-50 btn-primary rounded-pill px-4 py-3" onClick={() => console.log("Create Exam clicked")}>
                                Create Exam
                            </Link>
                        </div>

                    </div>
                </section>
                </div>
                {/* Features */}
                <section className="py-4 py-lg-5" style={{ background: 'var(--bg)' }}>

                    <div className="container">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <SpotlightCard className="h-100 shadow-sm border-0 surface" spotlightColor="rgba(0, 229, 255, 0.2)">
                                    <div className="p-6">
                                        <div className="mb-3" aria-hidden>
                                            <span className="icon-circle bg-primary-subtle text-primary">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" /></svg>
                                            </span>
                                        </div>
                                        <h3 className="fw-bold mb-2">Manual Question Editor</h3>
                                        <p className="text-secondary">Build your assessments manually with MCQ, MSQ, and open-ended questions. Reorder easily and save safely.</p>
                                    </div>
                                </SpotlightCard>

                            </div>
                            <div>
                                <SpotlightCard className="h-100 shadow-sm border-0 surface" spotlightColor="rgba(0, 229, 255, 0.2)">
                                    <div className="p-6">
                                        <div className="mb-3" aria-hidden>
                                            <span className="icon-circle bg-success-subtle text-success">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.5" /></svg>
                                            </span>
                                        </div>
                                        <h3 className="fw-bold mb-2">Proctored & Secure</h3>
                                        <p className="text-secondary">Camera checks, tab-switch detection, timed sections, and randomized question banks reduce malpractice.</p>
                                    </div>
                                </SpotlightCard>
                            </div>
                            <div>
                                <SpotlightCard className="h-100 shadow-sm border-0 surface" spotlightColor="rgba(0, 229, 255, 0.2)">
                                    <div className="p-6">
                                        <div className="mb-3" aria-hidden>
                                            <span className="icon-circle bg-warning-subtle text-warning">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16v10H4z" stroke="currentColor" strokeWidth="1.5" /><path d="M8 7V4h8v3" stroke="currentColor" strokeWidth="1.5" /></svg>
                                            </span>
                                        </div>
                                        <h3 className="fw-bold mb-2">Instant Analytics</h3>
                                        <p className="text-secondary">Detailed insights by topic, Bloom level, and cohort. Export to CSV/PDF and share with stakeholders.</p>
                                    </div>
                                </SpotlightCard>
                            </div>
                        </div>
                    </div>
                </section>
            </ClickSpark>
            <Footer />
        </div>
    );
};

export default Home;