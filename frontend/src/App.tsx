import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { Layout } from './components/Layout'
import { ManagerDetail } from './pages/ManagerDetail'
import { DepartmentDetail } from './pages/DepartmentDetail'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/manager/:id" element={<ManagerDetail />} />
        <Route path="/department/:name" element={<DepartmentDetail />} />
      </Routes>
    </Layout>
  )
}

export default App
