import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Shell from './components/layout/Shell'
import SearchPage from './pages/SearchPage'
import QueuePage from './pages/QueuePage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import ArtistPage from './pages/ArtistPage'
import AlbumPage from './pages/AlbumPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<SearchPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="artist/:mbid" element={<ArtistPage />} />
          <Route path="album/:mbid" element={<AlbumPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
