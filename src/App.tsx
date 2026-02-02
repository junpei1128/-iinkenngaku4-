import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReportList } from './pages/ReportList';
import { ReportDetail } from './pages/ReportDetail';
import { ReportShared } from './pages/ReportShared';
import { RecipientRegister } from './pages/RecipientRegister';
import { Login } from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/reports" replace />} />
        <Route path="/reports" element={<ReportList />} />
        <Route path="/reports/new" element={<ReportDetail />} />
        <Route path="/reports/:id" element={<ReportDetail />} />
        <Route path="/reports/shared/:token" element={<ReportShared />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recipients" element={<RecipientRegister />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
