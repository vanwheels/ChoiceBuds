/**
 * ReleaseNotesMarkdown.tsx - Shared Release-Body Renderer
 * Both ReleaseNotesModal.tsx (the startup popup) and ReleaseNotesSection.tsx
 * (Settings' full history) render the same GitHub Release `body` markdown -
 * factored out here so the element-style mapping (matching the app's zinc
 * dark theme, since no @tailwindcss/typography plugin is installed) is only
 * defined once. remark-gfm covers tables/checklists/strikethrough, which
 * past release notes have used.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReleaseNotesMarkdownProps {
  body: string;
}

export default function ReleaseNotesMarkdown({ body }: ReleaseNotesMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h3 className="mt-3 mb-1 text-sm font-bold text-zinc-100 first:mt-0">{children}</h3>,
        h2: ({ children }) => <h3 className="mt-3 mb-1 text-sm font-bold text-zinc-100 first:mt-0">{children}</h3>,
        h3: ({ children }) => <h4 className="mt-2 mb-1 text-xs font-bold text-zinc-100 first:mt-0">{children}</h4>,
        p: ({ children }) => <p className="mb-2 text-xs text-zinc-300 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 text-xs text-zinc-300">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 text-xs text-zinc-300">{children}</ol>,
        li: ({ children }) => <li className="leading-snug">{children}</li>,
        a: ({ children, href }) => (
          <a
            href={href}
            className="text-accent-gold hover:underline cursor-pointer"
            onClick={e => {
              e.preventDefault();
              if (href) window.electron.openExternal(href);
            }}
          >
            {children}
          </a>
        ),
        code: ({ children }) => <code className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-[11px] text-zinc-200">{children}</code>,
        strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
        del: ({ children }) => <del className="text-zinc-500">{children}</del>,
        table: ({ children }) => <table className="mb-2 w-full border-collapse text-xs">{children}</table>,
        th: ({ children }) => <th className="border border-zinc-700 px-2 py-1 text-left text-zinc-200">{children}</th>,
        td: ({ children }) => <td className="border border-zinc-700 px-2 py-1 text-zinc-300">{children}</td>,
        hr: () => <hr className="my-3 border-zinc-700" />,
      }}
    >
      {body}
    </ReactMarkdown>
  );
}
