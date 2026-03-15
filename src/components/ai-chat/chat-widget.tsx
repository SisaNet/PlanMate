'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatWidgetProps {
  projectContext?: {
    id: string
    name: string
    municipality: string
    building_type: string
    gfa_sqm: number | null
    conditions: string[]
  }
}

export function ChatWidget({ projectContext }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
          projectContext,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Chat button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 print:hidden',
          isOpen
            ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 print:hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">PlanMate AI</h3>
              <p className="text-[10px] text-neutral-400">Compliance Assistant</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Bot className="mb-3 h-10 w-10 text-neutral-300" />
                <p className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Hi! I&apos;m PlanMate AI.
                </p>
                <p className="text-xs text-neutral-400 max-w-[240px]">
                  Ask me about building regulations, submission requirements, or compliance checks.
                </p>
                <div className="mt-4 space-y-2 w-full">
                  {[
                    'What documents do I need for a residential submission?',
                    'Explain SANS 10400-XA energy requirements',
                    'What are dolomite risk requirements?',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion)
                        textareaRef.current?.focus()
                      }}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-xs text-neutral-600 transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-blue-700 dark:hover:bg-blue-950/20"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-2',
                      msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    <div className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800'
                    )}>
                      {msg.role === 'user' ? (
                        <User className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5 text-neutral-500" />
                      )}
                    </div>
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <Bot className="h-3.5 w-3.5 text-neutral-500" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2 dark:bg-neutral-800">
                      <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                      <span className="text-xs text-neutral-400">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-neutral-100 p-3 dark:border-neutral-800">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about compliance..."
                className="min-h-[40px] max-h-[100px] resize-none rounded-xl border-neutral-200 text-sm dark:border-neutral-700"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
