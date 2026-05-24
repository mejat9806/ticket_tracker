import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { lowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import ruby from 'highlight.js/lib/languages/ruby'
import EditorToolbar from './EditorToolbar'
import { useMutation } from '@tanstack/react-query'
import { uploadImageToWebhook } from '../utils/uploadImage'

export default function RichEditor({
    value,
    onChange,
    extensions = [],
    owner,
    repo,
    minHeight = 120,
    showToolbar = true,
}: {
    value?: string
    onChange: (html: string) => void
    extensions?: any[]
    owner?: string | null
    repo?: string | null
    minHeight?: number
    showToolbar?: boolean
}) {
    const [isUploading, setIsUploading] = React.useState(false)
    const uploadMutation = useMutation({ mutationFn: ({ file, owner, repo }: { file: File; owner?: string | null; repo?: string | null }) => uploadImageToWebhook(file, owner, repo) })

        // register common languages for lowlight/highlighting
        ; (function registerLowlightLanguages() {
            try {
                lowlight.registerLanguage('javascript', javascript)
                lowlight.registerLanguage('typescript', typescript)
                lowlight.registerLanguage('python', python)
                lowlight.registerLanguage('bash', bash)
                lowlight.registerLanguage('css', css)
                lowlight.registerLanguage('html', xml)
                lowlight.registerLanguage('xml', xml)
                lowlight.registerLanguage('json', json)
                lowlight.registerLanguage('java', java)
                lowlight.registerLanguage('go', go)
                lowlight.registerLanguage('ruby', ruby)
            } catch (err) {
                // ignore if languages already registered or packages missing at runtime
                // console.warn('lowlight language registration failed', err)
            }
        })()

    const editor = useEditor({
        extensions: [
            CodeBlockLowlight.configure({ lowlight }),
            ...extensions,
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            try {
                const html = editor.getHTML()
                onChange(html)
            } catch (err) {
                console.error('RichEditor onUpdate error', err)
            }
        }
    })

    // sync external value
    React.useEffect(() => {
        if (!editor) return
        const current = editor.getHTML()
        if ((value || '') !== current) editor.commands.setContent(value || '', false)
    }, [value, editor])

    React.useEffect(() => {
        if (!editor) return

        const uploadAndInsert = async (file: File) => {
            try {
                const result = await uploadMutation.mutateAsync({ file, owner, repo })
                const url = result
                if (!url) throw new Error('Upload did not return an image URL')
                editor.chain().focus().setImage({ src: url }).run()
            } catch (err) {
                console.warn('rich editor upload failed, falling back to local object URL', err)
                const blobUrl = URL.createObjectURL(file)
                editor.chain().focus().setImage({ src: blobUrl }).run()
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
            }
        }

        const onDrop = async (e: DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            const dt = e.dataTransfer
            if (!dt) return
            dt.dropEffect = 'copy'
            const files = Array.from(dt.files).filter(f => f.type.startsWith('image/'))
            if (files.length === 0) return
            setIsUploading(true)
            try {
                await Promise.all(files.map(f => uploadAndInsert(f)))
            } catch (err) {
                console.error('RichEditor image upload failed', err)
                alert('Image upload failed: ' + (err instanceof Error ? err.message : String(err)))
            } finally {
                setIsUploading(false)
            }
        }

        const onPaste = async (e: ClipboardEvent) => {
            e.stopPropagation()
            const items = e.clipboardData?.items
            if (!items) return
            const fileItems = Array.from(items).filter(i => i.kind === 'file' && i.type.startsWith('image/'))
            if (fileItems.length === 0) return
            setIsUploading(true)
            try {
                await Promise.all(fileItems.map(async (it) => {
                    const file = it.getAsFile()
                    if (file) await uploadAndInsert(file)
                }))
            } catch (err) {
                console.error('RichEditor image paste upload failed', err)
                alert('Image upload failed: ' + (err instanceof Error ? err.message : String(err)))
            } finally {
                setIsUploading(false)
            }
        }

        const dom = editor.view.dom as HTMLElement
        dom.addEventListener('drop', onDrop)
        dom.addEventListener('paste', onPaste as any)
        dom.addEventListener('dragover', (ev) => { ev.preventDefault(); ev.stopPropagation() })
        return () => {
            dom.removeEventListener('drop', onDrop)
            dom.removeEventListener('paste', onPaste as any)
        }
    }, [editor, owner, repo])

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || !editor) return
        const list = Array.from(files).filter(f => f.type.startsWith('image/'))
        if (list.length === 0) return
        setIsUploading(true)
        try {
            for (const f of list) {
                try {
                    const url = await uploadMutation.mutateAsync({ file: f, owner, repo })
                    if (!url) throw new Error('Upload did not return an image URL')
                    editor.chain().focus().setImage({ src: url }).run()
                } catch (err) {
                    console.warn('file upload failed, using local object URL', err)
                    const blobUrl = URL.createObjectURL(f)
                    editor.chain().focus().setImage({ src: blobUrl }).run()
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
                }
            }
        } catch (err) {
            console.error('file select upload failed', err)
            alert('Image upload failed: ' + (err instanceof Error ? err.message : String(err)))
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div>
            {showToolbar && <div className="px-0 pt-0"><EditorToolbar editor={editor} /></div>}
            <div className="mt-2" style={{ minHeight }}>{/* editor container */}
                <EditorContent editor={editor} className="prose-editor text-sm leading-relaxed" />
            </div>
            <div className="mt-2 flex items-center gap-2">
                <input id="rich-editor-image" type="file" accept="image/*" onChange={(e) => handleFileSelect(e.target.files)} className="hidden" />
                <label htmlFor="rich-editor-image" className="px-2 py-1 border rounded text-sm cursor-pointer bg-white">Add image</label>
                {isUploading && <span className="text-sm text-slate-500">Uploading...</span>}
            </div>
        </div>
    )
}
