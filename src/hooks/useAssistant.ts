import { useRef, useState } from 'react'
import { serverNow } from '../api/serverClock'
import { readApiKey } from '../assistant/config'
import { ERROR_MESSAGES, messageFor } from '../assistant/errors'
import { askAssistant, type ChatTurn } from '../assistant/gemini'
import { localDate } from '../engine/time'

export interface ChatMessage {
  id: string
  role: 'user' | 'model' | 'error'
  text: string
  toolsUsed?: string[]
}

// Earlier turns go back to Gemini as plain text, so "and yesterday?" makes sense.
// Error bubbles are ours, not the model's, so they are left out.
const HISTORY_TURNS = 10

function historyOf(messages: ChatMessage[]): ChatTurn[] {
  return messages
    .filter((message) => message.role !== 'error')
    .slice(-HISTORY_TURNS)
    .map((message) => ({ role: message.role === 'user' ? 'user' : 'model', text: message.text }))
}

export function useAssistant(timeZone: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState(false)
  // A ref, not only state: two quick clicks happen before React re-renders.
  const pendingRef = useRef(false)
  const apiKey = readApiKey()

  function add(message: Omit<ChatMessage, 'id'>): void {
    setMessages((current) => [...current, { id: crypto.randomUUID(), ...message }])
  }

  async function ask(question: string): Promise<void> {
    const text = question.trim()
    if (!text || pendingRef.current) return
    pendingRef.current = true
    setPending(true)

    const history = historyOf(messages)
    add({ role: 'user', text })
    try {
      // "Today" is the shop's date by the server clock, not the browser's.
      const today = localDate(serverNow(), timeZone)
      const answer = await askAssistant(text, { apiKey, today, timeZone, history })
      add({ role: 'model', text: answer.text, toolsUsed: answer.toolsUsed })
    } catch (error) {
      console.warn('Assistant failed:', error) // detail for the developer; the user sees a short message
      add({ role: 'error', text: messageFor(error) })
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return { messages, pending, ask, missingKeyMessage: apiKey ? null : ERROR_MESSAGES.missing_key }
}
