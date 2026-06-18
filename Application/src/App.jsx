import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen     from './screens/LoginScreen';
import SignupScreen    from './screens/SignupScreen';
import HomeScreen      from './screens/HomeScreen';
import BodyInputScreen from './screens/BodyInputScreen';
import WorkoutScreen   from './screens/WorkoutScreen';
import HistoryScreen   from './screens/HistoryScreen';
import LibraryScreen   from './screens/LibraryScreen';
import AuthService     from './services/authService';
import SyncService     from './services/syncService';

function PrivateRoute({ children }) {
  return AuthService.getCurrentUser() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  // 이미 로그인된 상태로 앱 로드 시 DB에서 최신 데이터 동기화
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) SyncService.load(user.userId);
  }, []);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/login"   element={<LoginScreen />} />
          <Route path="/signup"  element={<SignupScreen />} />
          <Route path="/"        element={<PrivateRoute><HomeScreen /></PrivateRoute>} />
          <Route path="/body"    element={<PrivateRoute><BodyInputScreen /></PrivateRoute>} />
          <Route path="/workout" element={<PrivateRoute><WorkoutScreen /></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><HistoryScreen /></PrivateRoute>} />
          <Route path="/library" element={<PrivateRoute><LibraryScreen /></PrivateRoute>} />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
