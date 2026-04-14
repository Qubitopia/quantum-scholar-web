import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home.jsx';
import Settings from './pages/settings.jsx';
import Login from './pages/login.jsx';
import Verify from './pages/verify.jsx';
import NewAuth from './pages/newAuth.jsx';
import ManageExam from './pages/exam/manageExam.jsx';
import EditExam from './pages/exam/editExam.jsx';
import ManageCandidates from './pages/exam/manageCandidates.jsx';
import Temp from './pages/temp.jsx';
import ViewExam from './pages/testPoral/viewExam.jsx';
import StartExam from './pages/testPoral/startExam.jsx';
import ExamSession from './pages/testPoral/examSession.jsx';

function App() {
  // Use HashRouter in production builds so opening `build/index.html`
  // directly (or serving the `build/` folder as a static site) won't
  // make the Router see the filesystem path (e.g. `/build/index.html`).
  // In dev we keep BrowserRouter for clean URLs.
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/verify" element={<Verify />} />
        <Route path="/authNewUser/verify" element={<NewAuth />} />
        <Route path="/exam/manageExam" element={<ManageExam />} />
        <Route path="/exam/editExam" element={<EditExam />} />
        <Route path="/exam/manageCandidates" element={<ManageCandidates />} />
        <Route path="/temp" element={<Temp />} />
        <Route path="*" element={<Home />} />
        
        {/* User */}
        <Route path="/examPortal/viewExam" element={<ViewExam />} />
        <Route path="/examPortal/startExam" element={<StartExam />} />
        <Route path="/examPortal/session" element={<ExamSession />} />
      </Routes>
    </Router>
  );
}

export default App;
