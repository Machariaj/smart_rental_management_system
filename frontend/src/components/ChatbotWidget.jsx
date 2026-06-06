import { useState, useEffect, useRef } from 'react'
import { chatAPI } from '../services/api'

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [starting, setStarting] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open && !sessionId) startSession()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startSession = async () => {
    setStarting(true)
    try {
      const res = await chatAPI.startSession()
      setSessionId(res.data.session_id)
      setMessages([{
        sender: 'bot',
        text: "Hi! I'm your property assistant. I can help with:\n• Rent payments & bills\n• Maintenance requests\n• Lease information\n• Utility queries\n\nHow can I help you today?"
      }])
    } catch {
      setMessages([{ sender: 'bot', text: 'Chat is currently unavailable. Please try again later.' }])
    } finally {
      setStarting(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || !sessionId || sending) return
    const userText = input.trim()
    setInput('')
    setMessages(m => [...m, { sender: 'user', text: userText }])
    setSending(true)
    try {
      const res = await chatAPI.sendMessage(sessionId, userText)
      setMessages(m => [...m, { sender: 'bot', text: res.data.reply }])
    } catch {
      setMessages(m => [...m, { sender: 'bot', text: "Sorry, I couldn't process that. Please try again." }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 bg-white rounded-2xl shadow-2xl border w-80 flex flex-col" style={{ height: '440px' }}>
          {/* Header */}
          <div className="bg-blue-700 text-white px-4 py-3 rounded-t-2xl flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <div>
                <p className="font-semibold text-sm">Property Assistant</p>
                <p className="text-xs text-blue-200">Always here to help</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-blue-200 hover:text-white text-xl leading-none">&times;</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {starting ? (
              <div className="text-center text-gray-400 text-sm py-8">Connecting...</div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'bot' && (
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-1.5 flex-shrink-0 mt-0.5">
                      <span className="text-xs">🏠</span>
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-1.5 flex-shrink-0">
                  <span className="text-xs">🏠</span>
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-500">
                  <span className="flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex gap-1.5 flex-wrap flex-shrink-0">
              {['How do I pay rent?', 'Report a repair', 'Check my balance'].map(prompt => (
                <button key={prompt}
                  onClick={() => { setInput(prompt); }}
                  className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 hover:bg-blue-100">
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={sendMessage} className="p-3 border-t flex gap-2 flex-shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border rounded-full px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              disabled={starting || !sessionId}
            />
            <button type="submit" disabled={!input.trim() || sending || !sessionId}
              className="bg-blue-600 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 flex-shrink-0 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-blue-700 hover:bg-blue-800 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105"
        title="Chat with Property Assistant">
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          </>
        )}
      </button>
    </div>
  )
}
