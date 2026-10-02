import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { useRef } from 'react';
import { apiFetch } from '../lib/api';

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

async function uploadImage(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) return null;
    if (file.size > 8 * 1024 * 1024) {
        alert('Ukuran gambar maksimal 8MB.');
        return null;
    }
    const fd = new FormData();
    fd.append('image', file);
    const res = await apiFetch<{ url: string }>('/news/images', { method: 'POST', body: fd });
    return res.url;
}

export default function TipTapBody({ value, onChange }: { value: string; onChange: (html: string) => void }) {
    const fileRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({ inline: false, allowBase64: false }),
        ],
        content: value || '',
        editorProps: {
            attributes: {
                class: 'min-h-[180px] w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand prose-invert',
            },
            handleDrop: (view, event, _slice, moved) => {
                if (moved) return false;
                const files = Array.from(event.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
                if (files.length === 0) return false;
                event.preventDefault();
                const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
                (async () => {
                    for (const file of files) {
                        try {
                            const url = await uploadImage(file);
                            if (url) {
                                const { schema } = view.state;
                                const node = schema.nodes.image?.create({ src: url });
                                if (node) {
                                    const tr = view.state.tr.insert(pos ?? view.state.doc.content.size, node);
                                    view.dispatch(tr);
                                }
                            }
                        } catch {
                            /* biarkan editor tetap jalan */
                        }
                    }
                })();
                return true;
            },
            handlePaste: (view, event) => {
                const files = Array.from(event.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'));
                if (files.length === 0) return false;
                event.preventDefault();
                (async () => {
                    for (const file of files) {
                        try {
                            const url = await uploadImage(file);
                            if (url) {
                                const { schema } = view.state;
                                const node = schema.nodes.image?.create({ src: url });
                                if (node) {
                                    const tr = view.state.tr.replaceSelectionWith(node);
                                    view.dispatch(tr);
                                }
                            }
                        } catch {
                            /* abaikan */
                        }
                    }
                })();
                return true;
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    function pickImage() {
        fileRef.current?.click();
    }

    async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            const url = await uploadImage(file);
            if (url) editor?.chain().focus().setImage({ src: url }).run();
        } catch {
            /* abaikan */
        }
    }

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
                <ToolbarButton onClick={pickImage} title="Sisipkan gambar (bisa juga drag-drop / paste)">🖼</ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} title="Urungkan">↩</ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} title="Ulangi">↪</ToolbarButton>
                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={onFile} />
            </div>
            <p className="text-[11px] text-muted mb-1.5">Seret & letakkan foto ke dalam tulisan, atau tempel (paste) langsung.</p>
            <EditorContent editor={editor} />
        </div>
    );
}
