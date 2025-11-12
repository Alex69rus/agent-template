import React from 'react'
import VoiceAgent from './components/VoiceAgent'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>💼 Finance Advisor</h1>
        <p>Real-time Voice Agent for Retirement Planning & Investment Advice</p>
      </header>
      <VoiceAgent />
    </div>
  )
}

export default App
