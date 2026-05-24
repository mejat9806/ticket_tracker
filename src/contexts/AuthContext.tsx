import React from 'react'

const AuthContext = React.createContext<{ providerToken: string | null } | undefined>(undefined)

export const AuthProvider = ({ providerToken, children }: { providerToken: string | null; children: React.ReactNode }) => {
    return <AuthContext.Provider value={{ providerToken }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
    const ctx = React.useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}

export default AuthContext
