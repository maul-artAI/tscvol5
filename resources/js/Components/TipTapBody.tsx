import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

function ToolbarButton({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`px-2 py-1 rounded text-xs font-bold transition ${active ? 'bg-brand text-white' : 'text-muted hover:text-white hover:bg-white/10'}`}
        >
            {children}
        </button>
    );
}

export default function TipTapBody({ value, onChange }: { value: string; onChange: (html: string) => void }) {
    const editor = useEditor({
        extensions: [StarterKit],
        content: value || '',
        editorProps: {
            attributes: {
                class: 'min-h-[180px] w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand prose-invert',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    return (
        <div>
            <div className="flex flex-wrap gap-1 mb-1.5 bg-dark border border-border rounded px-1.5 py-1">
                <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Tebal">B</ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Miring"><i>I</i></ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} title="Coret">S</ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Judul besar">H2</ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="Judul kecil">H3</ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Daftar poin">•≡</ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Daftar bernomor">1≡</ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Kutipan">❝</ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} title="Urungkan">↩</ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} title="Ulangi">↪</ToolbarButton>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}
