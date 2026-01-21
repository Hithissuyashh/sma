import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ExecutiveDashboard from './pages/dashboards/ExecutiveDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import ResidentDashboard from './pages/dashboards/ResidentDashboard';
import WatchmanDashboard from './pages/dashboards/WatchmanDashboard';

import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster position="top-center" reverseOrder={false} />
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
                    <Route path="/admin-dashboard" element={<AdminDashboard />} />
                    <Route path="/resident-dashboard" element={<ResidentDashboard />} />
                    <Route path="/watchman-dashboard" element={<WatchmanDashboard />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App
