import { Routes, Route } from 'react-router-dom'
import Dashboard from '@/renderer/pages/Dashboard'
import Login from '@/renderer/pages/Login'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}

export default App
