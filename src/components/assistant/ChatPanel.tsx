import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAssistant, type ChatMessage } from '../../hooks/useAssistant'
import { Card } from '../common/Card'
import { btnPrimary, btnSecondarySm, input } from '../ui'

// One button per C2 question, plus the D5 one. Clicking sends it straight away.
const EXAMPLE_QUESTIONS = [
  'How many orders?',
  'What is the total revenue?',
  'What is the best-selling option?',
  'Revenue by payment method?',
  'What is the average order value?',
  'How many orders actually got the coupon?',
  'How many orders today?',
  'Who is our best customer?',
]

function Bubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3 py-2 text-sm text-white">{message.text}</p>
      </div>
    )
  }
  if (message.role === 'error') {
    return (
      <p className="max-w-[85%] rounded-2xl rounded-bl-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {message.text}
      </p>
    )
  }
  return (
    <div className="max-w-[85%]">
      <p className="rounded-2xl rounded-bl-sm border border-line bg-white px-3 py-2 text-sm whitespace-pre-line text-ink">
        {message.text}
      </p>
      {/* Which of our functions the numbers came from. */}
      {message.toolsUsed && message.toolsUsed.length > 0 && (
        <p className="mt-0.5 px-1 text-xs text-muted">via {message.toolsUsed.join(', ')}</p>
      )}
    </div>
  )
}

export function ChatPanel({ timeZone }: { timeZone: string }) {
  const { messages, pending, ask, missingKeyMessage } = useAssistant(timeZone)
  const [draft, setDraft] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  // Keep the newest message in view.
  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, pending])

  // Why Send / the example buttons cannot be used right now (null = they can).
  const blockedReason = missingKeyMessage ?? (pending ? 'Waiting for the answer…' : null)
  const sendReason = blockedReason ?? (draft.trim() ? null : 'Type a question first.')

  function send(question: string): void {
    if (blockedReason) return
    setDraft('')
    void ask(question)
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!sendReason) send(draft)
  }

  return (
    <Card
      title="Sales assistant"
      subtitle="Ask about orders and sales. Every number comes from the shop data, not from the AI."
      headingLevel={2}
      className="flex h-[70dvh] flex-col lg:h-full"
    >
      {missingKeyMessage && (
        <p role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {missingKeyMessage}
        </p>
      )}

      {/* Phones and small tablets: one row you swipe sideways, so the chat keeps the screen. From md: wraps. */}
      <div
        className="-mx-3 mb-2 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
        aria-label="Example questions"
        role="group"
      >
        {EXAMPLE_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            className={`${btnSecondarySm} shrink-0 whitespace-nowrap md:shrink`}
            disabled={blockedReason !== null}
            title={blockedReason ?? undefined}
            onClick={() => send(question)}
          >
            {question}
          </button>
        ))}
      </div>

      <div
        ref={logRef}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl bg-page p-3"
      >
        {messages.length === 0 && (
          <p className="text-sm text-muted">Pick an example question above or type your own below.</p>
        )}
        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
        {pending && <p className="text-sm text-muted">Thinking…</p>}
      </div>

      <form className="mt-2 flex gap-2" onSubmit={onSubmit}>
        <label htmlFor="assistant-question" className="sr-only">
          Ask a question
        </label>
        <input
          id="assistant-question"
          className={`${input} min-w-0 flex-1`}
          placeholder="e.g. Revenue by payment method?"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={missingKeyMessage !== null}
          autoComplete="off"
        />
        <button type="submit" className={btnPrimary} disabled={sendReason !== null} title={sendReason ?? undefined}>
          Send
        </button>
      </form>
    </Card>
  )
}
