import React from 'react'
import VoiceAgent from './components/VoiceAgent'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🎙️ Real-time Voice Agent</h1>
        <p>AI-powered voice assistant with real-time conversation capabilities</p>
      </header>
      <VoiceAgent />
    </div>
  )
}

export default App
