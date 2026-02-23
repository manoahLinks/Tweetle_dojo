import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ClassicGamePage } from './pages/ClassicGamePage';
import { DailyGamePage } from './pages/DailyGamePage';
import { TournamentListPage } from './pages/TournamentListPage';
import { TournamentGamePage } from './pages/TournamentGamePage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/classic" element={<ClassicGamePage />} />
        <Route path="/daily" element={<DailyGamePage />} />
        <Route path="/tournaments" element={<TournamentListPage />} />
        <Route path="/tournament/:id" element={<TournamentGamePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Layout>
  );
}
