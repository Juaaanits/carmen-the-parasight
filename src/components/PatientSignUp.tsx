import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../config/firebase'
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import '../styles/patientSign-up.css'
import '../styles/csp-utilities.css'

interface FormData {
  email: string
  phone: string
  password: string
  confirmPassword: string
  birthDate: string
  firstName: string
  lastName: string
  address: string
  countryCode: string
  remember: boolean
}

interface ValidationErrors {
  email?: string
  phone?: string
  password?: string
  confirmPassword?: string
  birthDate?: string
  firstName?: string
  lastName?: string
  address?: string
  general?: string
}

interface AuthError {
  code: string
  message: string
}

const PatientSignUp: React.FC = React.memo(() => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>({
    email: '', phone: '', password: '', confirmPassword: '', birthDate: '',
    firstName: '', lastName: '', address: '', countryCode: '+1', remember: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isGoogleSignUpInProgress, setIsGoogleSignUpInProgress] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [isFormValid, setIsFormValid] = useState(false)
  const [lastActivity, setLastActivity] = useState<Date>(new Date())
  const [formProgress, setFormProgress] = useState(0)

  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, [])
  const phoneRegex = useMemo(() => /^[\d\s\-\(\)]+$/, [])
  const nameRegex = useMemo(() => /^[a-zA-Z\s\-']+$/, [])
  const isFormComplete = useMemo(() => 
    formData.email.trim() !== '' && formData.phone.trim() !== '' && 
    formData.password.length > 0 && formData.confirmPassword.length > 0 &&
    formData.birthDate !== '' && formData.firstName.trim() !== '' &&
    formData.lastName.trim() !== '' && formData.address.trim() !== '', 
    [formData]
  )

  // Auto-refresh user activity
  useEffect(() => {
    const interval = setInterval(() => {
      setLastActivity(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const errors: ValidationErrors = {}
    
    if (formData.email.trim() && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    if (formData.phone.trim() && !phoneRegex.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number'
    }
    if (formData.password.length > 0 && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long'
    }
    if (formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    if (formData.firstName.trim() && !nameRegex.test(formData.firstName)) {
      errors.firstName = 'Please enter a valid first name'
    }
    if (formData.lastName.trim() && !nameRegex.test(formData.lastName)) {
      errors.lastName = 'Please enter a valid last name'
    }
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      if (age < 13 || age > 120) {
        errors.birthDate = 'Please enter a valid birth date (age 13-120)'
      }
    }
    
    setValidationErrors(errors)
    setIsFormValid(Object.keys(errors).length === 0 && isFormComplete)
    
    // Calculate form progress
    const totalFields = 8 // email, phone, password, confirmPassword, birthDate, firstName, lastName, address
    const filledFields = [
      formData.email.trim(),
      formData.phone.trim(),
      formData.password,
      formData.confirmPassword,
      formData.birthDate,
      formData.firstName.trim(),
      formData.lastName.trim(),
      formData.address.trim()
    ].filter(Boolean).length
    
    setFormProgress(Math.round((filledFields / totalFields) * 100))
  }, [formData, emailRegex, phoneRegex, nameRegex, isFormComplete])

  useEffect(() => {
    if (emailInputRef.current && !formData.email) {
      emailInputRef.current.focus()
    }
  }, [formData.email])

  useEffect(() => {
    if (formData.email || formData.firstName || formData.lastName || formData.remember) {
      localStorage.setItem('patientSignUp_data', JSON.stringify({
        email: formData.email, firstName: formData.firstName, 
        lastName: formData.lastName, countryCode: formData.countryCode, 
        remember: formData.remember
      }))
    }
  }, [formData.email, formData.firstName, formData.lastName, formData.countryCode, formData.remember])

  useEffect(() => {
    const savedData = localStorage.getItem('patientSignUp_data')
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        setFormData(prev => ({
          ...prev,
          email: parsed.email || '',
          firstName: parsed.firstName || '',
          lastName: parsed.lastName || '',
          countryCode: parsed.countryCode || '+1',
          remember: parsed.remember || false
        }))
      } catch (error) {
        console.warn('Failed to load saved form data:', error)
      }
    }
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error message when user starts typing
    if (errorMessage) {
      setErrorMessage('')
    }
    
    // Clear specific validation error
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
  }, [errorMessage, validationErrors])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
    // Focus back to password input after toggle
    setTimeout(() => {
      passwordInputRef.current?.focus()
    }, 100)
  }, [])

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword(prev => !prev)
    // Focus back to confirm password input after toggle
    setTimeout(() => {
      confirmPasswordInputRef.current?.focus()
    }, 100)
  }, [])

  const validateForm = useCallback((): ValidationErrors => {
    const errors: ValidationErrors = {}

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required'
    } else if (!phoneRegex.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long'
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.birthDate) {
      errors.birthDate = 'Birth date is required'
    } else {
      const birthDate = new Date(formData.birthDate)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      if (age < 13 || age > 120) {
        errors.birthDate = 'Please enter a valid birth date (age 13-120)'
      }
    }

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required'
    } else if (!nameRegex.test(formData.firstName)) {
      errors.firstName = 'Please enter a valid first name'
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required'
    } else if (!nameRegex.test(formData.lastName)) {
      errors.lastName = 'Please enter a valid last name'
    }

    if (!formData.address.trim()) {
      errors.address = 'Address is required'
    }

    return errors
  }, [formData, emailRegex, phoneRegex, nameRegex])

  const showError = useCallback((message: string) => {
    setErrorMessage(message)
    setSuccessMessage('')
    
    // Auto-hide error after 8 seconds
    setTimeout(() => {
      setErrorMessage('')
    }, 8000)
  }, [])

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message)
    setErrorMessage('')
    
    // Auto-hide success after 5 seconds
    setTimeout(() => {
      setSuccessMessage('')
    }, 5000)
  }, [])

  const handleEmailSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      showError(Object.values(errors)[0] || 'Please fix the errors above')
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    setValidationErrors({})

    try {
      console.log('Creating account with Firebase:', { email: formData.email })
      
      // Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      
      if (userCredential.user) {
        console.log('Account created successfully:', userCredential.user.email)
        
        // Send email verification
        await sendEmailVerification(userCredential.user)
        
        showSuccess('Account created successfully! Please check your email for verification.')
        
        // Save successful registration time
        localStorage.setItem('lastSuccessfulRegistration', new Date().toISOString())
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate('/patient-portal')
        }, 2000)
      }
      
    } catch (error: any) {
      console.error('Sign up error:', error)
      
      let errorMsg = 'Sign up failed. Please try again.'
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMsg = 'This email is already registered. Please use a different email or sign in.'
          break
        case 'auth/weak-password':
          errorMsg = 'Password is too weak. Please choose a stronger password.'
          break
        case 'auth/invalid-email':
          errorMsg = 'Please enter a valid email address.'
          break
        case 'auth/operation-not-allowed':
          errorMsg = 'Email registration is not enabled. Please contact support.'
          break
        case 'auth/too-many-requests':
          errorMsg = 'Too many attempts. Please try again later.'
          break
        case 'auth/network-request-failed':
          errorMsg = 'Network error. Please check your internet connection and try again.'
          break
        case 'auth/invalid-credential':
          errorMsg = 'Invalid email or password. Please check your credentials and try again.'
          break
        default:
          errorMsg = error.message || errorMsg
      }
      
      showError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [formData.email, formData.password, validateForm, showError, showSuccess, navigate])

  const handleGoogleSignUp = useCallback(async () => {
    if (isGoogleSignUpInProgress) return
    
    setIsGoogleSignUpInProgress(true)
    setErrorMessage('')
    setSuccessMessage('')
    setValidationErrors({})

    try {
      console.log('Starting Google Sign-Up with Firebase...')
      
      // Configure Google provider
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      provider.setCustomParameters({
        prompt: 'select_account'
      })
      
      // Sign up with popup
      const result = await signInWithPopup(auth, provider)
      
      if (result.user) {
        console.log('Google sign-up successful:', result.user.email)
        showSuccess('Google sign-up successful! Welcome to LingapLink!')
        
        // Save successful registration time
        localStorage.setItem('lastSuccessfulRegistration', new Date().toISOString())
        
        // Redirect after successful sign-up
        setTimeout(() => {
          navigate('/patient-portal')
        }, 1500)
      }
      
    } catch (error: any) {
      console.error('Google sign-up failed:', error)
      
      let errorMsg = 'Google sign-up failed. Please try again.'
      
      // Handle specific Google auth errors
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMsg = 'Sign-up was cancelled. Please try again.'
          break
        case 'auth/popup-blocked':
          errorMsg = 'Please allow popups for this site and try again.'
          break
        case 'auth/unauthorized-domain':
          errorMsg = 'This domain is not authorized for Google sign-up.'
          break
        case 'auth/operation-not-allowed':
          errorMsg = 'Google sign-up is not enabled. Please contact support.'
          break
        case 'auth/network-request-failed':
          errorMsg = 'Network error. Please check your connection and try again.'
          break
        case 'auth/account-exists-with-different-credential':
          errorMsg = 'An account already exists with this email using a different sign-in method. Please try signing in instead.'
          break
        case 'auth/cancelled-popup-request':
          errorMsg = 'Sign-up was cancelled. Please try again.'
          break
        default:
          if (error.message.includes('not enabled')) {
            errorMsg = 'Google Sign-Up is not enabled for this application.'
          } else if (error.message.includes('api-key-not-valid')) {
            errorMsg = 'Firebase configuration error. Please check your API key configuration.'
          } else if (error.message) {
            errorMsg = error.message
          }
      }
      
      showError(errorMsg)
    } finally {
      // Reset after a delay to prevent rapid clicking
      setTimeout(() => {
        setIsGoogleSignUpInProgress(false)
      }, 2000)
    }
  }, [isGoogleSignUpInProgress, showError, showSuccess, navigate])

  const handleSocialSignUp = useCallback((platform: string) => {
    console.log(`Signing up with ${platform}...`)
    showError(`${platform} sign-up is not implemented yet. Please use email or Google sign-up.`)
  }, [showError])

  const handleClose = useCallback(() => {
    navigate('/')
  }, [navigate])

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
      if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault()
        if (isFormValid && !isLoading) {
          formRef.current?.requestSubmit()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, isFormValid, isLoading])

  // Accessibility: Announce form state changes
  useEffect(() => {
    if (errorMessage) {
      const liveRegion = document.getElementById('live-region')
      if (liveRegion) {
        liveRegion.textContent = `Error: ${errorMessage}`
      }
    }
  }, [errorMessage])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
      if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault()
        if (isFormValid && !isLoading) {
          formRef.current?.requestSubmit()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, isFormValid, isLoading])

  useEffect(() => {
    if (errorMessage) {
      const liveRegion = document.getElementById('live-region')
      if (liveRegion) {
        liveRegion.textContent = `Error: ${errorMessage}`
      }
    }
  }, [errorMessage])

  return (
    <div className="signup-container" role="main" aria-label="Patient Sign Up">
      {/* Accessibility live region */}
      <div id="live-region" aria-live="assertive" aria-atomic="true" className="sr-only"></div>
      
      <div className="left-section" aria-hidden="true">
        <div className="logo-section">
          <div className="logo">
            <span className="logo-icon" aria-hidden="true">♡</span>
            <span className="logo-text">LingapLink</span>
          </div>
        </div>
        <div className="medical-professionals">
          <div className="professionals-content">
            <div className="professional-group">
              <div className="professional doctor" aria-hidden="true"></div>
              <div className="professional nurse-1" aria-hidden="true"></div>
              <div className="professional nurse-2" aria-hidden="true"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="right-section">
        <div className="close-btn">
          <button 
            type="button" 
            className="close-link" 
            onClick={handleClose}
            aria-label="Close and return to home page"
          >
            ×
          </button>
        </div>
        
        <div className="signup-content">
          <div className="signup-header">
            <h1>Hey there</h1>
            <p>Already know LingapLink? <a href="/patient-sign-in" className="login-link">Log in</a></p>
          </div>

          <form 
            ref={formRef}
            onSubmit={handleEmailSignUp} 
            className="signup-form"
            aria-label="Sign up form"
            noValidate
          >
            {/* Form Progress Indicator */}
            <div className="form-progress" role="progressbar" aria-valuenow={formProgress} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress-bar" style={{ width: `${formProgress}%` }}></div>
              <span className="progress-text">{formProgress}% Complete</span>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                required 
                autoComplete="email"
                value={formData.email}
                onChange={handleInputChange}
                ref={emailInputRef}
                disabled={isLoading}
                aria-describedby={validationErrors.email ? "email-error" : undefined}
                aria-invalid={!!validationErrors.email}
                placeholder="Enter your email address"
              />
              {validationErrors.email && (
                <div id="email-error" className="field-error" role="alert">
                  {validationErrors.email}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <div className="phone-input">
                <select 
                  className="country-code" 
                  id="countryCode" 
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  aria-label="Country code"
                >
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+63">🇵🇭 +63</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+82">🇰🇷 +82</option>
                  <option value="+86">🇨🇳 +86</option>
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+61">🇦🇺 +61</option>
                </select>
                <input 
                  type="tel" 
                  id="phone" 
                  name="phone" 
                  required 
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  aria-describedby={validationErrors.phone ? "phone-error" : undefined}
                  aria-invalid={!!validationErrors.phone}
                  placeholder="Enter your phone number"
                />
              </div>
              {validationErrors.phone && (
                <div id="phone-error" className="field-error" role="alert">
                  {validationErrors.phone}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Your password</label>
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                name="password" 
                required 
                autoComplete="new-password"
                minLength={6}
                value={formData.password}
                onChange={handleInputChange}
                ref={passwordInputRef}
                disabled={isLoading}
                aria-describedby={validationErrors.password ? "password-error" : undefined}
                aria-invalid={!!validationErrors.password}
                placeholder="Enter your password"
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              {validationErrors.password && (
                <div id="password-error" className="field-error" role="alert">
                  {validationErrors.password}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="birthDate">Birth Date</label>
              <input 
                type="date" 
                id="birthDate" 
                name="birthDate" 
                required 
                autoComplete="bday"
                value={formData.birthDate}
                onChange={handleInputChange}
                disabled={isLoading}
                aria-describedby={validationErrors.birthDate ? "birthDate-error" : undefined}
                aria-invalid={!!validationErrors.birthDate}
              />
              {validationErrors.birthDate && (
                <div id="birthDate-error" className="field-error" role="alert">
                  {validationErrors.birthDate}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input 
                type="text" 
                id="firstName" 
                name="firstName" 
                required 
                autoComplete="given-name"
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={isLoading}
                aria-describedby={validationErrors.firstName ? "firstName-error" : undefined}
                aria-invalid={!!validationErrors.firstName}
                placeholder="Enter your first name"
              />
              {validationErrors.firstName && (
                <div id="firstName-error" className="field-error" role="alert">
                  {validationErrors.firstName}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input 
                type="text" 
                id="lastName" 
                name="lastName" 
                required 
                autoComplete="family-name"
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={isLoading}
                aria-describedby={validationErrors.lastName ? "lastName-error" : undefined}
                aria-invalid={!!validationErrors.lastName}
                placeholder="Enter your last name"
              />
              {validationErrors.lastName && (
                <div id="lastName-error" className="field-error" role="alert">
                  {validationErrors.lastName}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input 
                type="text" 
                id="address" 
                name="address" 
                required 
                autoComplete="street-address"
                value={formData.address}
                onChange={handleInputChange}
                disabled={isLoading}
                aria-describedby={validationErrors.address ? "address-error" : undefined}
                aria-invalid={!!validationErrors.address}
                placeholder="Enter your address"
              />
              {validationErrors.address && (
                <div id="address-error" className="field-error" role="alert">
                  {validationErrors.address}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                id="confirmPassword" 
                name="confirmPassword" 
                required 
                autoComplete="new-password"
                minLength={6}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                ref={confirmPasswordInputRef}
                disabled={isLoading}
                aria-describedby={validationErrors.confirmPassword ? "confirmPassword-error" : undefined}
                aria-invalid={!!validationErrors.confirmPassword}
                placeholder="Confirm your password"
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={toggleConfirmPasswordVisibility}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                disabled={isLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              {validationErrors.confirmPassword && (
                <div id="confirmPassword-error" className="field-error" role="alert">
                  {validationErrors.confirmPassword}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="signup-btn" 
              disabled={isLoading || !isFormValid}
              aria-describedby={!isFormValid ? "form-validation-help" : undefined}
            >
              <span className="btn-text" style={{ display: isLoading ? 'none' : 'block' }}>
                Sign Up
              </span>
              <div 
                className="loading-spinner" 
                style={{ display: isLoading ? 'block' : 'none' }}
                aria-hidden="true"
              ></div>
            </button>
            {!isFormValid && (
              <div id="form-validation-help" className="sr-only">
                Please fill in all required fields correctly to enable sign up
              </div>
            )}
          </form>

          <div className="form-footer">
            <div className="remember-me">
              <input 
                type="checkbox" 
                id="remember" 
                name="remember"
                checked={formData.remember}
                onChange={handleInputChange}
                disabled={isLoading}
                aria-describedby="remember-help"
              />
              <label htmlFor="remember">Remember me</label>
              <div id="remember-help" className="sr-only">
                Keep me signed in on this device
              </div>
            </div>
          </div>

          <div className="divider">
            <span>Or sign up with</span>
          </div>

          <div className="social-buttons" role="group" aria-label="Social sign up options">
            <button 
              type="button" 
              className="social-btn google-btn" 
              onClick={handleGoogleSignUp}
              disabled={isLoading || isGoogleSignUpInProgress}
              aria-label="Sign up with Google"
              aria-describedby="google-signup-help"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>
            <div id="google-signup-help" className="sr-only">
              Sign up using your Google account
            </div>
            
            <button 
              type="button" 
              className="social-btn facebook-btn" 
              onClick={() => handleSocialSignUp('Facebook')}
              disabled={isLoading}
              aria-label="Sign up with Facebook"
              aria-describedby="facebook-signup-help"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
            <div id="facebook-signup-help" className="sr-only">
              Sign up using your Facebook account (not available)
            </div>
            
            <button 
              type="button" 
              className="social-btn apple-btn" 
              onClick={() => handleSocialSignUp('Apple')}
              disabled={isLoading}
              aria-label="Sign up with Apple"
              aria-describedby="apple-signup-help"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </button>
            <div id="apple-signup-help" className="sr-only">
              Sign up using your Apple account (not available)
            </div>
          </div>

          {errorMessage && (
            <div className="error-message" role="alert" aria-live="assertive">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="success-message" aria-live="polite">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              {successMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

PatientSignUp.displayName = 'PatientSignUp'

export default PatientSignUp 