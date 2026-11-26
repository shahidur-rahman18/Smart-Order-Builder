import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAssistant, type ChatMessage } from '../../hooks/useAssistant'
import { btnSecondaryXs, input } from '../ui'

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

// Round Send button with its own classes (not btnPrimary), so nothing overrides its size or shape.
// Disabled: light grey with a dark grey arrow, so the arrow is still easy to see.
const sendButton =
  'inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

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

export function ChatPanel({ timeZone, onClose }: { timeZone: string; onClose: () => void }) {
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
    <section
      aria-labelledby="assistant-title"
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 bg-ink px-3 py-2.5 text-white sm:px-4 sm:py-3">
        <div className="min-w-0">
          <h2 id="assistant-title" className="text-base leading-tight font-bold">
            Sales assistant
          </h2>
          {/* Very short screens (a phone held sideways): hide this line so the messages get the room. */}
          <p className="text-xs leading-snug text-white/70 [@media(max-height:30rem)]:hidden">
            Ask about orders and sales. Every number comes from the shop data, not from the AI.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close chat"
          title="Close chat"
          className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-white/70 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-2.5 sm:p-3">
        {missingKeyMessage && (
          <p role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {missingKeyMessage}
          </p>
        )}

        {/* Small chips that wrap onto new lines, so every question is readable.
            The box has a max height and scrolls, so the messages keep most of the window. */}
        <div
          className="mb-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto sm:max-h-28 [@media(max-height:30rem)]:max-h-8"
          aria-label="Example questions"
          role="group"
        >
          {EXAMPLE_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              className={`${btnSecondaryXs} rounded-full`}
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

        <form className="mt-2 flex items-center gap-2" onSubmit={onSubmit}>
          <label htmlFor="assistant-question" className="sr-only">
            Ask a question
          </label>
          <input
            id="assistant-question"
            className={`${input} min-w-0 flex-1`}
            placeholder="Type your question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={missingKeyMessage !== null}
            autoComplete="off"
          />
          <button
            type="submit"
            aria-label="Send"
            className={sendButton}
            disabled={sendReason !== null}
            title={sendReason ?? 'Send'}
          >
            {/* A drawn arrow, not the ↑ text character, so it can be big and thick.
                width/height are set on the tag too, so its size never depends on a CSS class. */}
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              className="shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </form>
      </div>
    </section>
  )
}
