import React from 'react'
import { createRootRoute, Outlet, Link } from '@tanstack/react-router'

function RouteComponent({ children }: { children?: React.ReactNode }) {
    return (
        <div className="min-h-screen p-6">
            <nav className="flex gap-3 mb-6">
                <Link to="/create-issue" className="px-3 py-1 bg-indigo-600 text-white rounded">Create Issue</Link>
                <Link to="/view-issues" className="px-3 py-1 bg-slate-200 rounded">View Issues</Link>
            </nav>
            <div>
                <Outlet />
            </div>
        </div>
    )
}

export const Route = createRootRoute({
    component: RouteComponent,
})
