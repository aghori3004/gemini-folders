import { useAuth } from "~hooks/useAuth"
import { useState } from "react"
import "~style.css" // Ensure Tailwind styles are loaded

function IndexPopup() {
  const { user, loading, login, logout } = useAuth()
  const [imgError, setImgError] = useState(false)

  // 1. Loading State
  if (loading) {
    return (
      <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-h-[400px] plasmo-w-[300px] plasmo-bg-white">
        <div className="plasmo-animate-spin plasmo-rounded-full plasmo-h-8 plasmo-w-8 plasmo-border-b-2 plasmo-border-blue-500"></div>
      </div>
    )
  }

  // 2. Logged In State
  if (user) {
    return (
      <div className="plasmo-w-[300px] plasmo-h-[400px] plasmo-flex plasmo-flex-col plasmo-bg-white plasmo-font-sans">
        {/* Header */}
        <div className="plasmo-bg-[#f8f9fa] plasmo-p-4 plasmo-border-b plasmo-border-gray-200 plasmo-flex plasmo-items-center plasmo-justify-between">
          <h1 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-800">Gemini Folders</h1>
          <div className="plasmo-h-2 plasmo-w-2 plasmo-rounded-full plasmo-bg-green-500" title="Online"></div>
        </div>

        {/* User Info */}
        <div className="plasmo-flex-1 plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-p-6 plasmo-gap-4">
          <div className="plasmo-h-20 plasmo-w-20 plasmo-rounded-full plasmo-overflow-hidden plasmo-border-2 plasmo-border-blue-100">
            {user.photoURL && !imgError ? (
              <img
                src={user.photoURL}
                onError={() => setImgError(true)}
                alt="Profile"
                className="plasmo-h-full plasmo-w-full plasmo-object-cover"
              />
            ) : (
              <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-w-full plasmo-h-full plasmo-bg-blue-100 plasmo-text-blue-600 plasmo-text-xl plasmo-font-bold">
                {user.email?.[0]?.toUpperCase() || "G"}
              </div>
            )}
          </div>
          <div className="plasmo-text-center">
            <h2 className="plasmo-font-medium plasmo-text-gray-900">{user.displayName}</h2>
            <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-truncate plasmo-max-w-[200px]">{user.email}</p>
          </div>

          <div className="plasmo-bg-blue-50 plasmo-text-blue-700 plasmo-px-4 plasmo-py-2 plasmo-rounded-lg plasmo-text-xs plasmo-font-medium">
            Syncing Active
          </div>
        </div>

        {/* Footer Actions */}
        <div className="plasmo-p-4 plasmo-border-t plasmo-border-gray-100">
          <button
            onClick={() => logout()}
            className="plasmo-w-full plasmo-py-2 plasmo-px-4 plasmo-rounded-full plasmo-border plasmo-border-gray-300 plasmo-text-gray-700 plasmo-text-sm plasmo-font-medium hover:plasmo-bg-gray-50 plasmo-transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // 3. Logged Out State (Sign In)
  return (
    <div className="plasmo-w-[300px] plasmo-h-[400px] plasmo-flex plasmo-flex-col plasmo-bg-white plasmo-font-sans">
      <div className="plasmo-flex-1 plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-p-8 plasmo-text-center">

        {/* Logo / Icon Area */}
        <div className="plasmo-mb-6 plasmo-h-16 plasmo-w-16 plasmo-bg-blue-600 plasmo-rounded-2xl plasmo-flex plasmo-items-center plasmo-justify-center plasmo-text-white plasmo-shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="plasmo-w-8 plasmo-h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </div>

        <h1 className="plasmo-text-xl plasmo-font-semibold plasmo-text-gray-900 plasmo-mb-2">Gemini Folders</h1>
        <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-mb-8">
          Organize your chats into folders and keep your workspace clean.
        </p>

        <button
          onClick={() => login()}
          className="plasmo-w-full plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-3 plasmo-bg-white plasmo-border plasmo-border-gray-300 plasmo-text-gray-700 plasmo-font-medium plasmo-py-2.5 plasmo-px-4 plasmo-rounded-full hover:plasmo-bg-gray-50 plasmo-transition-all plasmo-shadow-sm hover:plasmo-shadow-md"
        >
          {/* Google G Logo */}
          <svg className="plasmo-w-5 plasmo-h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  )
}

export default IndexPopup