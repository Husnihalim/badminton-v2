import { useState } from 'react'
import { MessageSquare, X, Send, Star, Smile } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { submitUserFeedback } from '../lib/api'

export default function FeedbackWidget() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion' | 'other'>('suggestion')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only show feedback widget for logged-in users
  if (!user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      await submitUserFeedback(feedbackType, message, rating)
      setSubmitted(true)
      setMessage('')
      setRating(null)
      setTimeout(() => {
        setSubmitted(false)
        setIsOpen(false)
      }, 2500)
    } catch (err: unknown) {
      console.error('Feedback submit error:', err)
      setError('Could not submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#047857',
          color: 'white',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease-in-out',
        }}
        className="hover:scale-105"
        aria-label="Submit Feedback"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Feedback Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '65px',
            right: '0',
            width: '320px',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
            padding: '16px',
            fontFamily: 'Inter, sans-serif',
            animation: 'fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Smile size={48} style={{ color: '#047857', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px' }}>Thank You!</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Your feedback has been submitted to the Superadmin.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Share your Feedback</h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>SaaS MVP</span>
              </div>

              {/* Feedback Type Toggle */}
              <div style={{ display: 'flex', gap: '6px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2px', backgroundColor: '#f8fafc' }}>
                {(['suggestion', 'bug', 'other'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFeedbackType(type)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      textTransform: 'capitalize',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: feedbackType === type ? 'white' : 'transparent',
                      color: feedbackType === type ? '#047857' : '#64748b',
                      boxShadow: feedbackType === type ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Star Rating */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Rate your experience (optional)
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{ border: 'none', background: 'transparent', padding: '2px', cursor: 'pointer' }}
                    >
                      <Star
                        size={18}
                        style={{
                          fill: rating !== null && star <= rating ? '#fbbf24' : 'none',
                          color: rating !== null && star <= rating ? '#fbbf24' : '#cbd5e1',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="feedback-message" style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  What's on your mind?
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={feedbackType === 'bug' ? "Describe the bug and how to reproduce it..." : "Suggest a new feature or improvement..."}
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '8px',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>

              {error && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</span>}

              {/* Action Buttons */}
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                style={{
                  minHeight: '38px',
                  backgroundColor: '#047857',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: message.trim() ? 'pointer' : 'not-allowed',
                  opacity: message.trim() ? 1 : 0.6,
                }}
              >
                <Send size={14} />
                {isSubmitting ? 'Sending...' : 'Submit Feedback'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
