import React from 'react'
import type { Editor } from '@tiptap/react'

export default function EditorToolbar({ editor }: { editor: Editor | null }) {
    if (!editor) return null

    const Btn = ({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) => (
        <button type="button" onClick={onClick} className={`px-2 py-1 border rounded ${active ? 'bg-slate-200' : ''}`}>{label}</button>
    )

    return (
        <div className="flex gap-2 mb-2">
            <Btn label="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} />
            <Btn label="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />
            <Btn label="H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} />
            <Btn label="Bullets" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} />
            <Btn label="Numbered" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} />
            <Btn label="Code" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} />
            <button
                type="button"
                onClick={() => {
                    const url = window.prompt('Enter link URL')
                    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
                }}
                className="px-2 py-1 border rounded"
            >
                Link
            </button>
            <button
                type="button"
                onClick={() => {
                    const src = window.prompt('Enter image URL')
                    if (src) editor.chain().focus().setImage({ src }).run()
                }}
                className="px-2 py-1 border rounded"
            >
                Image
            </button>
        </div>
    )
}
