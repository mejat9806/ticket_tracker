import React from 'react';
import { useForm } from 'react-hook-form';
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TurndownService from 'turndown'
import RichEditor from './components/RichEditor'
import { useMutation } from '@tanstack/react-query'
import { uploadImageToGitHub } from './utils/uploadImage'

type NewIssue = {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels: string[];
  assignees: string[];
  milestone?: number;
};

export const GitHubIssueCreator = ({ providerToken, showAttachments = false }: { providerToken?: string | null, showAttachments?: boolean }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, getValues } = useForm({
    defaultValues: {
      owner: 'mejat9806',
      repoName: 'start-coolify',
      title: 'teset',
      body: 'teste',
      assignees: 'mejat9806', // Default to the repo owner for convenience
      labels: 'test',
      milestoneId: '',
      providerToken: providerToken || '',
    },
  });

  const [images, setImages] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const defaultBody = 'teste'
  const [editorHTML, setEditorHTML] = React.useState(defaultBody)



  const submitMutation = useMutation({
    mutationFn: async (issue: NewIssue) => {
      const { owner, repo, ...payload } = issue
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `token ${providerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        // GitHub explains the failure (bad label, unknown milestone, no access) in `message`
        const error = (await response.json().catch(() => null)) as
          | { message?: string; errors?: { field?: string; code?: string }[] }
          | null
        // e.g. "milestone (invalid)" when the repo has no milestone with that number
        const fieldErrors = (error?.errors ?? []).map((fieldError) => `${fieldError.field} (${fieldError.code})`).join(', ')
        throw new Error(
          `GitHub returned ${response.status}${error?.message ? `: ${error.message}` : ''}${fieldErrors ? ` - ${fieldErrors}` : ''}`,
        )
      }
      return (await response.json()) as { html_url: string }
    }
  })

  // RichEditor manages its own paste/drop upload listeners

  // Handle image selections with safety
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    setImages((prev) => [...prev, ...selectedFiles]);
  };

  // Remove a specific image from state and preview list
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Create temporary URLs for previews and clean up to prevent memory leaks
  React.useEffect(() => {
    if (images.length === 0) {
      setPreviews([]);
      return;
    }
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  const onSubmit = async (data: any) => {

    // Convert comma-separated strings to clean arrays
    const parseList = (val: string) => val ? val.split(',').map(i => i.trim()).filter(Boolean) : [];

    // Convert editor HTML -> Markdown
    const turndown = new TurndownService()
    const html = editorHTML || (data.body || '')
    const bodyMarkdown = turndown.turndown(html)

    if (!providerToken) {
      alert('Sign in with GitHub before creating an issue.');
      return;
    }

    try {
      // Attachments are uploaded to the repo and added to the end of the body as images
      const attachmentMarkdown = await Promise.all(
        images.map(async (file) => {
          const url = await uploadImageToGitHub({ file, owner: data.owner, repo: data.repoName, token: providerToken })
          return `![${file.name}](${url})`
        }),
      )
      const body = [bodyMarkdown, ...attachmentMarkdown].filter(Boolean).join('\n\n')

      const createdIssue = await submitMutation.mutateAsync({
        owner: data.owner,
        repo: data.repoName,
        title: data.title,
        body,
        labels: parseList(data.labels),
        assignees: parseList(data.assignees),
        milestone: data.milestoneId ? Number(data.milestoneId) : undefined,
      })
      alert(`🚀 Issue created: ${createdIssue.html_url}`);
      reset();
      setImages([]);
    } catch (error) {
      console.error('Submission error:', error);
      alert(`Could not create the issue. ${error instanceof Error ? error.message : ''}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative">

        {/* Decorative App Header Bar */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-8 py-6 text-white flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">GitHub Issue Automation</h1>
            <p className="text-indigo-100 text-sm mt-1">Create issues directly on GitHub</p>
          </div>
          <svg className="w-10 h-10 text-indigo-200 fill-current" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.003 1.003.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
        </div>

        {/* Input Form Area */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">

          {/* Target Metadata Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <div>
              <label htmlFor="owner" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Repository Owner</label>
              <input
                id="owner"
                placeholder="e.g. facebook"
                className={`mt-1.5 block w-full px-3 py-2 bg-white text-sm border ${errors.owner ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'} rounded-lg shadow-sm focus:outline-none focus:ring-2`}
                {...register("owner", { required: "Repository owner is required" })}
              />
            </div>
            <div>
              <label htmlFor="repoName" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Repository Name</label>
              <input
                id="repoName"
                placeholder="e.g. react"
                className={`mt-1.5 block w-full px-3 py-2 bg-white text-sm border ${errors.repoName ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'} rounded-lg shadow-sm focus:outline-none focus:ring-2`}
                {...register("repoName", { required: "Repository name is required" })}
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Primary Core Content Input Block */}
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Issue Title</label>
              <input
                id="title"
                placeholder="Brief summary of the bug or feature..."
                className={`mt-1.5 block w-full px-4 py-2.5 text-sm border ${errors.title ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'} rounded-lg shadow-sm focus:outline-none focus:ring-2`}
                {...register("title", { required: "An issue title title is required." })}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.title.message as string}</p>}
            </div>

            <div>
              <label htmlFor="body" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Issue Description Body</label>
              <div className="mt-2 border rounded-lg p-0 border-slate-200 shadow-sm bg-white text-left prose-editor-container">
                <div className="px-4 pt-4">
                  {/* Use shared RichEditor component */}
                  <RichEditor
                    value={editorHTML}
                    onChange={(html) => setEditorHTML(html)}
                    extensions={[StarterKit, Image, Link]}
                    owner={getValues().owner}
                    repo={getValues().repoName}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Correct Image Handling Block (Attachments) */}
          {showAttachments && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Attachments</label>
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 relative flex items-center justify-between gap-4">
                <input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex-1 text-sm text-slate-600">
                  <p className="font-semibold text-xs">Drop visual assets or click to upload</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Supports standard PNG, JPG snapshots (multiple allowed)</p>
                </div>
                <div className="border border-slate-300 rounded-lg py-1.5 px-3 bg-white text-slate-600 font-medium text-xs hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm cursor-pointer relative z-10">
                  Select File
                </div>
              </div>

              {/* Managed Thumbnail Preview Track */}
              {previews.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                  {previews.map((src, idx) => (
                    <div key={idx} className="relative group w-20 h-20 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                      <img src={src} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold uppercase tracking-wider"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Optional Meta Tags Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label htmlFor="assignees" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Assignees</label>
              <input
                id="assignees"
                placeholder="user1, user2"
                className="mt-1.5 block w-full px-3 py-2 text-sm border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                {...register("assignees")}
              />
            </div>
            <div>
              <label htmlFor="labels" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Labels</label>
              <input
                id="labels"
                placeholder="bug, critical"
                className="mt-1.5 block w-full px-3 py-2 text-sm border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                {...register("labels")}
              />
            </div>
            <div>
              <label htmlFor="milestoneId" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Milestone ID</label>
              <input
                id="milestoneId"
                type="number"
                placeholder="14"
                className="mt-1.5 block w-full px-3 py-2 text-sm border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                {...register("milestoneId")}
              />
            </div>
          </div>

          {/* Action Trigger Block */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white ${isSubmitting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transform active:scale-[0.99] transition-all`}
            >
              {isSubmitting ? "Creating Issue..." : "Create Issue"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default GitHubIssueCreator;