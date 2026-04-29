import { useState, useRef, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const Typewriter = ({ text, speed = 15 }) => {
  const [displayedText, setDisplayedText] = useState('')
  
  useEffect(() => {
    let i = 0
    let timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])
  
  return <>{displayedText.split('\n').map((line, j) => <span key={j}>{line}<br/></span>)}</>
}

function App() {
  const [file, setFile] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isAsking, setIsAsking] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! Upload a PDF on the left, and I'll answer your questions based strictly on its content." }
  ])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  
  const chatEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileUpload = async (uploadedFile) => {
    if (!uploadedFile || !uploadedFile.name.endsWith('.pdf')) {
      alert('Please select a valid PDF file.')
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', uploadedFile)

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      setFile(data.filename)
      setNumPages(data.pages)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Document "${data.filename}" processed. I'm ready to answer your questions based on its ${data.pages} pages.` 
      }])
    } catch (error) {
      console.error(error)
      alert('Error uploading PDF. Make sure the backend is running.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!input.trim() || isAsking) return

    const question = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setIsAsking(true)

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history
        })
      })

      if (!response.ok) throw new Error('Query failed')

      const data = await response.json()
      setMessages(prev => {
        const updated = prev.map(m => ({ ...m, isNew: false }))
        return [...updated, { 
          role: 'assistant', 
          content: data.answer, 
          citations: data.citations, 
          refused: data.refused,
          isNew: true
        }]
      })
      
      setHistory(prev => [
        ...prev, 
        { role: 'user', content: question },
        { role: 'assistant', content: data.answer }
      ].slice(-6))
      
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error processing your question." }])
    } finally {
      setIsAsking(false)
    }
  }

  const resetSession = async () => {
    try {
      await fetch(`${API_URL}/reset`, { method: 'POST' })
      setFile(null)
      setNumPages(0)
      setHistory([])
      setMessages([{ role: 'assistant', content: "Session reset. Please upload a new PDF to start over." }])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <h1>AskPDF</h1>
          <p className="subtitle">Grounded answers. No hallucinations.</p>
        </div>

        <div className="upload-section">
          {!file ? (
            <div 
              className={`drop-zone ${isDragging ? 'active' : ''}`}
              onClick={() => fileInputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                handleFileUpload(e.dataTransfer.files[0])
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e.target.files[0])}
                accept=".pdf" 
                hidden 
              />
              <div className="drop-zone-content">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <p>{isUploading ? 'Processing...' : <>Drop PDF here or <span>click to browse</span></>}</p>
              </div>
            </div>
          ) : (
            <div className="file-info">
              <div className="file-details">
                <p>{file}</p>
                <p>{numPages} pages loaded</p>
              </div>
              <button onClick={resetSession} className="reset-btn">Reset Session</button>
            </div>
          )}
        </div>

        <div className="instructions">
          <h3>Strict Grounding</h3>
          <ul>
            <li>Answers only from PDF</li>
            <li>Page-level citations</li>
            <li>No external knowledge</li>
          </ul>
        </div>
      </aside>

      <main className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role} ${msg.refused ? 'refused' : ''}`}>
              {msg.refused && <div className="refusal-label">Out of scope</div>}
              <div className="bubble">
                {msg.isNew ? (
                  <Typewriter text={msg.content} speed={15} />
                ) : (
                  msg.content.split('\n').map((line, j) => (
                    <span key={j}>{line}<br/></span>
                  ))
                )}
              </div>
              {msg.citations && msg.citations.length > 0 && (
                <div className="citations">
                  {msg.citations.map((page, j) => (
                    <span key={j} className="citation-tag">Page {page}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="input-area">
          <form className="chat-form" onSubmit={handleAsk}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isAsking ? "Typing..." : file ? "Ask about the document..." : "Upload a PDF to start..."}
              disabled={!file || isAsking}
              autoComplete="off"
            />
            <button type="submit" className="send-btn" disabled={!file || isAsking || !input.trim()}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default App
