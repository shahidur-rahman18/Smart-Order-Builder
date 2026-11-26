import { useEffect, useState } from 'react'
import { ChatPanel } from './ChatPanel'

// Round chat-bubble icon for the floating button.
function ChatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5c-4.97 0-9 3.36-9 7.5 0 2.1 1.04 4 2.72 5.36L5 20.5l4.13-2.07c.92.25 1.88.37 2.87.37 4.97 0 9-3.36 9-7.5s-4.03-7.8-9-7.8Z"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

// A button that always floats at the bottom right. Clicking it opens the
// chat window just above it, on top of the page.
export function FloatingAssistant({ timeZone }: { timeZone: string }) {
  const [open, setOpen] = useState(false)

  // Escape closes the window, like any pop-up.
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    // Phones and tablets: the page scrolls, so the footer is only at the very end.
    // Desktop: the dev tools footer is always on screen, so lg:bottom-14 keeps the button above it.
    <div className="fixed right-3 bottom-3 z-40 flex flex-col items-end gap-2 sm:right-4 sm:bottom-4 sm:gap-3 lg:bottom-14">
      {/* Hidden, not removed: the conversation survives closing the window.
          Phones: almost the whole screen. Tablets and up: a fixed-width window that never runs off screen. */}
      <div
        id="assistant-window"
        hidden={!open}
        className="h-[calc(100dvh-5.5rem)] w-[calc(100vw-1.5rem)] sm:h-[min(36rem,calc(100dvh-6.5rem))] sm:w-[24rem] md:w-[26rem] lg:h-[min(38rem,calc(100dvh-10rem))]"
      >
        <ChatPanel timeZone={timeZone} onClose={() => setOpen(false)} />
      </div>

      <button
        type="button"
        aria-label="Sales assistant"
        aria-expanded={open}
        aria-controls="assistant-window"
        title={open ? 'Close the sales assistant' : 'Open the sales assistant'}
        // Bounces only while closed (to catch the eye), and pauses on hover so it is easy to click.
        // motion-safe: people who turned on "reduce motion" in their system see no bounce.
        className={`${open ? '' : 'motion-safe:animate-soft-bounce hover:[animation-play-state:paused]'} inline-flex h-12 w-12 shrink-0 items-center sm:h-14 sm:w-14 justify-center cursor-pointer rounded-full bg-primary text-white shadow-lg ring-4 ring-white/70 transition hover:scale-105 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  )
}
