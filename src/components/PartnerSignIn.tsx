import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../config/firebase'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import '../styles/partnerSignIn.css'
import '../styles/csp-utilities.css'

const PartnerSignIn: React.FC = React.memo(() => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleSignInInProgress, setIsGoogleSignInInProgress] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password')
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      await signInWithEmailAndPassword(auth, email, password)
      showNotification('Sign in successful! Welcome back.', 'success')
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)

    } catch (error: any) {
      console.error('Sign in error:', error)
      let message = 'Sign in failed. Please try again.'
      
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email address.'
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password. Please try again.'
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.'
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.'
      }
      
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [email, password, navigate])

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setIsGoogleSignInInProgress(true)
      setErrorMessage('')
      
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      
      await signInWithPopup(auth, provider)
      
      showNotification('Google sign in successful! Welcome back.', 'success')
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)

    } catch (error: any) {
      console.error('Google sign in error:', error)
      setErrorMessage(error.message || 'Google sign in failed. Please try again.')
    } finally {
      setIsGoogleSignInInProgress(false)
    }
  }, [navigate])

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification')
    existingNotifications.forEach(notification => notification.remove())
    
    // Create notification
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
    `
    
    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close')
    closeBtn?.addEventListener('click', () => notification.remove())
    
    // Add to page
    document.body.appendChild(notification)
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-in'
        setTimeout(() => notification.remove(), 300)
      }
    }, 5000)
  }, [])

  return (
    <div className="partner-signin-container">
      {/* Left Side - Brand Section */}
      <div className="signin-brand">
        <div className="brand-logo">
          <i className="fas fa-heartbeat"></i>
          <span>LingapLink</span>
        </div>
        
        <div className="brand-content">
          <h1>Welcome Back</h1>
          <p>Sign in to your healthcare provider dashboard and continue managing your practice with our comprehensive platform.</p>
          
          <div className="brand-features">
            <div className="feature-item">
              <i className="fas fa-check-circle"></i>
              <span>Manage patient appointments</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-check-circle"></i>
              <span>Access consultation tools</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-check-circle"></i>
              <span>View analytics & reports</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-check-circle"></i>
              <span>Secure patient management</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="signin-form-section">
        <div className="signin-form-container">
          <div className="form-header">
            <div className="logo" style={{ color: '#0040e7' }}>
              <i className="fas fa-heartbeat" style={{ color: '#0040e7' }}></i>
              <span style={{ color: '#0040e7' }}>LingapLink</span>
            </div>
            <h2>Provider Sign In</h2>
            <p>Access your facility dashboard</p>
          </div>

          {errorMessage && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="signin-form">
            <div className="form-step">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="forgot-password">
                <a href="/reset-password">Forgot your password?</a>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </div>
            </div>
          </form>

          <div className="social-signup">
            <div className="divider">
              <span>or sign in with</span>
            </div>
            <button
              type="button"
              className="btn btn-google"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSignInInProgress}
            >
              <i className="fab fa-google"></i>
              {isGoogleSignInInProgress ? 'Signing in...' : 'Continue with Google'}
            </button>
          </div>

          <div className="signin-footer">
            <p>New to LingapLink? <a href="/partner-signup">Register your facility here</a></p>
            <p>Need help? <a href="/help">Contact our support team</a></p>
          </div>
        </div>
      </div>
    </div>
  )
})

PartnerSignIn.displayName = 'PartnerSignIn'

export default PartnerSignIn 