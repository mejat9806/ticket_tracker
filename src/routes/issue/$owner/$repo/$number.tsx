import React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useParams } from '@tanstack/react-router'
import { useAuth } from '../../../../contexts/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Image from '@tiptap/extension-image'
import TipTapLink from '@tiptap/extension-link'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import TurndownService from 'turndown'
import RichEditor from '../../../../components/RichEditor'

export const Route = createFileRoute('/issue/$owner/$repo/$number')({
  component: RouteComponent,
})

function RouteComponent() {
  const params = useParams({ from: Route.id })
  const owner = params.owner as string
  const repo = params.repo as string
  const number = params.number as string
  const { providerToken } = useAuth()

  const [issue, setIssue] = React.useState<any | null>(null)
  const [comments, setComments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [commentEditorHTML, setCommentEditorHTML] = React.useState('')

  const queryClient = useQueryClient()

  const collaboratorsQuery = useQuery({
    queryKey: ['collaborators', owner, repo, providerToken],
    queryFn: async () => {
      if (!owner || !repo) return []
      const url = `https://api.github.com/repos/${owner}/${repo}/collaborators?per_page=100`
      const resp = await fetch(url, { headers: providerToken ? { Authorization: `token ${providerToken}` } : undefined })
      if (!resp.ok) return []
      const json = await resp.json()
      if (Array.isArray(json)) return json
      if (json && Array.isArray((json as any).data)) return (json as any).data
      return []
    },
    enabled: Boolean(owner && repo),
  })
  console.log('Collaborators query', { status: collaboratorsQuery.status, data: collaboratorsQuery.data?.slice?.(0, 10), error: collaboratorsQuery.error })
  const issueQuery = useQuery({
    queryKey: ['issue', owner, repo, number, providerToken],
    queryFn: async () => {
      const issueResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`, {
        headers: providerToken ? { Authorization: `token ${providerToken}` } : undefined,
      })
      if (!issueResp.ok) throw new Error(`GitHub API returned ${issueResp.status}`)
      return issueResp.json()
    },
    enabled: Boolean(owner && repo && number),
  })

  const commentsQuery = useQuery({
    queryKey: ['comments', owner, repo, number, providerToken],
    queryFn: async () => {
      const issueData = issueQuery.data as any
      if (!issueData) return []
      const commentsResp = await fetch(issueData.comments_url, {
        headers: providerToken ? { Authorization: `token ${providerToken}` } : undefined,
      })
      if (!commentsResp.ok) throw new Error(`GitHub API returned ${commentsResp.status}`)
      return commentsResp.json()
    },
    enabled: Boolean(issueQuery.data),
  })

  React.useEffect(() => {
    if (issueQuery.data) setIssue(issueQuery.data)
    if (commentsQuery.data) setComments(commentsQuery.data)
    if (issueQuery.isError) setError((issueQuery.error as Error).message)
    if (commentsQuery.isError) setError((commentsQuery.error as Error).message)
    setLoading(issueQuery.isLoading || commentsQuery.isLoading)
  }, [issueQuery.data, commentsQuery.data, issueQuery.isLoading, commentsQuery.isLoading, issueQuery.isError, commentsQuery.isError])

  const postComment = async (markdown: string) => {
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(providerToken ? { Authorization: `token ${providerToken}` } : {}),
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({ body: markdown }),
    })
    if (!resp.ok) throw new Error(`GitHub API returned ${resp.status}`)
    return resp.json()
  }

  const commentMutation = useMutation({
    mutationFn: ({ markdown }: { markdown: string }) => postComment(markdown),
    onSuccess: (data) => {
      // prepend new comment
      queryClient.setQueryData(['comments', owner, repo, number, providerToken], (old: any) => [data, ...(old || [])])
      setCommentEditorHTML('')
    },
    onError: (err: any) => {
      alert('Failed to post comment: ' + (err.message || String(err)))
    }
  })

  const handleCommentSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const html = commentEditorHTML
    const markdown = new TurndownService().turndown(html || '')
    if (!markdown.trim()) return
    if (!issue) return
    commentMutation.mutate({ markdown })
  }

  const mentionSuggestions = React.useMemo(() => {
    const logins = new Set<string>()
    if (issue?.user?.login) {
      const l = String(issue.user.login).trim()
      if (l) logins.add(l)
    }
    comments.forEach(c => {
      const l = String(c?.user?.login ?? '').trim()
      if (l) logins.add(l)
    })
    // collaboratorsQuery.data may be an array or an object wrapper { status, data: [...] }
    const collabList = Array.isArray(collaboratorsQuery.data)
      ? collaboratorsQuery.data
      : (collaboratorsQuery.data && Array.isArray((collaboratorsQuery.data as any).data) ? (collaboratorsQuery.data as any).data : [])
    collabList.forEach((u: any) => {
      const l = String(u?.login ?? '').trim()
      if (l) logins.add(l)
    })
    const list = Array.from(logins).map((u) => ({ id: u, label: u }))
    try { console.debug('mentionSuggestions computed', { count: list.length, sample: list.slice(0, 10), collaboratorsStatus: collaboratorsQuery.status }) } catch (err) { }
    return list
  }, [issue, comments, collaboratorsQuery.data])

  // Keep a stable ref to the latest mentionSuggestions so the TipTap
  // `items` callback (created once) can read up-to-date suggestions.
  const mentionSuggestionsRef = React.useRef<typeof mentionSuggestions>(mentionSuggestions)
  React.useEffect(() => { mentionSuggestionsRef.current = mentionSuggestions }, [mentionSuggestions])

  const renderSuggestion = () => {
    // Use tippy.js for positioning and interactivity (per TipTap docs)
    let popup: any = null
    let container: HTMLDivElement | null = null

    const buildList = (items: any[], selectedIndex = 0, command?: any) => {
      if (!container) return
      container.innerHTML = items.map((it: any, i: number) => `<div data-index="${i}" style="padding:6px 8px;cursor:pointer;${i === selectedIndex ? 'background:#efefff' : ''}">${it.label || it.id}</div>`).join('')
      Array.from(container.querySelectorAll('[data-index]')).forEach((el) => {
        el.addEventListener('mousedown', (ev) => { ev.preventDefault(); const idx = Number((ev.currentTarget as HTMLElement).getAttribute('data-index')); const item = items[idx]; if (item && command) command(item) })
      })
    }

    return {
      onStart: (props: any) => {
        container = document.createElement('div')
        container.className = 'mention-suggestions'
        container.style.minWidth = '150px'
        container.style.maxWidth = '320px'
        container.style.background = 'white'
        container.style.color = '#0f172a'
        container.style.fontSize = '13px'
        container.style.lineHeight = '1.3'
        container.style.borderRadius = '6px'
        container.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)'
        container.style.padding = '4px'

        popup = tippy(document.body, {
          getReferenceClientRect: props.clientRect,
          content: container,
          appendTo: document.body,
          interactive: true,
          showOnCreate: true,
          trigger: 'manual',
          theme: 'light-border',
          arrow: true,
        })
        // Inject a small stylesheet once to override tippy's outer box
        if (!document.getElementById('mention-tippy-styles')) {
          const s = document.createElement('style')
          s.id = 'mention-tippy-styles'
          s.textContent = `
            .mention-tippy-box{ background: transparent !important; box-shadow: none !important; border: none !important; }
            .mention-tippy-box .tippy-content{ padding: 0 !important; }
            .mention-tippy-box .mention-suggestions{ box-shadow: 0 4px 14px rgba(0,0,0,0.1); border-radius:6px; padding:4px; background:white; color:#0f172a; }
          `
          document.head.appendChild(s)
        }
        try { console.debug('mention.render:onStart') } catch (err) { }
        const inst = Array.isArray(popup) ? popup[0] : popup
        try { inst.popper && inst.popper.classList.add('mention-tippy-box') } catch (err) { }
      },
      onUpdate: (props: any) => {
        const { items } = props
        if (!popup) return
        const inst = Array.isArray(popup) ? popup[0] : popup
        buildList(items || [], props.selectedIndex || 0, props.command)
        inst.setProps({ getReferenceClientRect: props.clientRect })
        try { console.debug('mention.render:onUpdate', { items: (items || []).map((i: any) => i.label || i.id), selected: props.selectedIndex }) } catch (err) { }
      },
      onKeyDown: (props: any) => {
        const event = props.event as KeyboardEvent
        const items = props.items || []
        const selected = typeof props.selectedIndex === 'number' ? props.selectedIndex : 0
        if (event.key === 'Enter' && items && items.length) {
          props.command(items[selected])
          return true
        }
        return false
      },
      onExit: () => {
        try { console.debug('mention.render:onExit') } catch (err) { }
        if (popup) {
          const inst = Array.isArray(popup) ? popup[0] : popup
          try { inst.destroy() } catch (err) { }
          popup = null
        }
        if (container) { container.remove(); container = null }
      }
    }
  }


  // Use shared RichEditor for comments (passes mention extension)
  const mentionExtension = Mention.configure({
    HTMLAttributes: { class: 'mention' },
    suggestion: {
      char: '@',
      startOfLine: false,
      items: ({ query }: { query: string }) => {
        const pool = mentionSuggestionsRef.current || []
        try { console.debug('mention items called', { query, pool: pool.length, collaboratorsLoaded: collaboratorsQuery.status }) } catch (err) { }
        if (!query) return pool.slice(0, 5)
        return pool.filter(m => ((m.label || m.id) + '').toLowerCase().includes(query.toLowerCase())).slice(0, 5)
      },
      render: renderSuggestion
    }
  })


  console.log('Issue data:', issue)
  if (loading) return <div>Loading issue...</div>
  if (error) return <div className="text-red-500">Error: {error}</div>
  if (!issue) return <div>No issue found.</div>

  return (
    <div className="max-w-3xl mx-auto my-6 bg-white p-6 rounded-xl shadow">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold">{issue.title}</h2>
          <p className="text-sm text-slate-500">#{issue.number} • {issue.user?.login}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/view-issues" className="px-3 py-1 bg-slate-200 rounded">Back</Link>
          <a href={issue.html_url} target="_blank" rel="noreferrer" className="px-3 py-1 bg-indigo-600 text-white rounded">Open on GitHub</a>
        </div>
      </div>

      <div className="prose mt-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={{
            pre: ({ node, ...props }) => (
              <pre className="bg-black text-white p-4 rounded-md overflow-auto font-mono text-sm leading-relaxed whitespace-pre-wrap break-words" {...props} />
            ),
            code: ({ inline, className, children, ...props }) => {
              if (inline) {
                return <code className="bg-slate-900 text-white px-1 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
              }
              return <code className="block bg-black text-white p-4 rounded-md font-mono text-sm leading-relaxed whitespace-pre-wrap break-words" {...props}>{children}</code>
            }
          }}
        >
          {issue.body || 'No description'}
        </ReactMarkdown>
      </div>

      <hr className="my-6" />
      <h3 className="font-semibold mb-3">Comments ({comments.length})</h3>
      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Add Comment</label>
        <div className="mt-2 border rounded p-2">
          <RichEditor
            value={commentEditorHTML}
            onChange={(html) => setCommentEditorHTML(html)}
            extensions={[StarterKit, Image, TipTapLink, mentionExtension]}
            owner={owner}
            repo={repo}
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => { setCommentEditorHTML('') }} className="px-3 py-1 bg-slate-200 rounded">Clear</button>
          <button type="button" onClick={(e) => handleCommentSubmit(e as any)} className="px-3 py-1 bg-indigo-600 text-white rounded">Post comment</button>
        </div>
      </div>
      <ul className="space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="p-3 border rounded">
            <p className="text-sm text-slate-600">{c.user?.login} commented</p>
            <div className="mt-2 comment-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                  pre: ({ node, ...props }) => (
                    <pre className="bg-black text-white p-4 rounded-md overflow-auto font-mono text-sm leading-relaxed whitespace-pre-wrap break-words" {...props} />
                  ),
                  code: ({ inline, className, children, ...props }) => {
                    if (inline) {
                      return <code className="bg-slate-900 text-white px-1 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
                    }
                    return <code className="block bg-black text-white p-4 rounded-md font-mono text-sm leading-relaxed whitespace-pre-wrap break-words" {...props}>{children}</code>
                  }
                }}
              >
                {c.body || 'No content'}
              </ReactMarkdown>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default RouteComponent

