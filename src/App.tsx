import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<h1 className="text-3xl font-bold text-blue-600 p-8">Hello World</h1>} />
    </Routes>
  )
}

export default App
