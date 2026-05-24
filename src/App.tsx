import { useEffect, useState } from 'react'
// images removed — not used in App
import './App.css'
import { supabase } from './supabaselogin'
import { Router, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { AuthProvider } from './contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Create a single Router instance once so it's stable across renders
const router = new Router({ routeTree } as any)



import type { Session } from '@supabase/supabase-js'

function App() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      console.log('Supabase session (initial):', session)
      if (session?.provider_token) console.log('GitHub provider token (initial):', session.provider_token)
      // Persist provider token when available so it can be used after redirects
      if (session?.provider_token) {
        try { localStorage.setItem('provider_token', session.provider_token) } catch (e) { /* ignore */ }
      }
      // Only navigate to create page if we're on the app root (avoid hijacking refresh/back navigation)
      if (session) {
        const p = window.location.pathname || '/'
        if (p === '/' || p === '' || p === '/index.html') {
          try {
            router.navigate({ to: '/create-issue' })
          } catch (e) {
            /* ignore navigation errors */
          }
        }
        // Remove any auth hash (access_token, etc.) from the URL
        if (window.location.hash) {
          history.replaceState(null, document.title, window.location.pathname + window.location.search)
        }
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      console.log('Auth state changed, session:', session)
      if (session?.provider_token) console.log('GitHub provider token (onAuthStateChange):', session.provider_token)
      // Persist provider token when available from auth state change
      if (session?.provider_token) {
        try { localStorage.setItem('provider_token', session.provider_token) } catch (e) { /* ignore */ }
      }
      if (session) {
        const p = window.location.pathname || '/'
        if (p === '/' || p === '' || p === '/index.html') {
          try { router.navigate({ to: '/create-issue' }) } catch (e) { /* ignore */ }
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const queryClient = new QueryClient()

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow p-8 text-center">
          <h2 className="text-2xl font-semibold mb-2">Sign in to continue</h2>
          <p className="text-sm text-slate-500 mb-6">Authenticate with GitHub to enable repository actions.</p>
          <button
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-slate-800 shadow"
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'github', options: { scopes: 'repo' } })}
          >
            Sign in with GitHub
          </button>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-50 font-sans antialiased">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-7 h-7 text-slate-700" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.003 1.003.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" /></svg>
              <h1 className="text-lg font-semibold">Issue Creator</h1>
            </div>
            <div>
              {session ? (
                <button
                  className="px-3 py-1 bg-white border border-slate-200 rounded text-sm text-slate-700 hover:bg-slate-50"
                  onClick={async () => {
                    await supabase.auth.signOut()
                    setSession(null)
                    console.log('User signed out')
                  }}
                >
                  Sign out
                </button>
              ) : (
                <button
                  className="px-3 py-1 bg-black text-white rounded text-sm hover:bg-slate-800"
                  onClick={() => {
                    supabase.auth.signInWithOAuth({ provider: 'github', options: { scopes: 'repo' } }).then(() => {
                      router.navigate({ to: "/create-issue" })
                    })
                  }}
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Prefer session token, fall back to persisted token (if set) */}
          <AuthProvider providerToken={(session?.provider_token ?? (typeof window !== 'undefined' ? localStorage.getItem('provider_token') : null)) ?? null}>
            {/* Stable Router instance built from generated route tree */}
            <RouterProvider router={router} />
          </AuthProvider>
        </main>
        <ReactQueryDevtools initialIsOpen={false} />
      </div>
    </QueryClientProvider>
  )

}

export default App
