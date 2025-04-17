import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AudioRecorder from './pages/AudioRecorder'; // ✅ Import your new component
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white">
        <div className="pb-20"> {/* Add padding for mobile navigation */}
          <Routes>
            {/* Redirect from the root path to '/record-audio' */}
            <Route path="/" element={<Navigate to="/record-audio" />} />

            <Route path="/record-audio" element={<AudioRecorder />} />
          </Routes>
        </div>
        <Navigation />
      </div>
    </Router>
  );
}

export default App;
