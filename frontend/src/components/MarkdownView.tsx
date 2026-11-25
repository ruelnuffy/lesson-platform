import ReactMarkdown from "react-markdown";

export function MarkdownView({ content }: { content: string }) {
  return (
    <div
      className="space-y-4 text-zinc-700 text-[15.5px] leading-[1.75]
      [&_h1]:text-2xl [&_h1]:sm:text-3xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:text-zinc-900 [&_h1]:mt-2 [&_h1]:mb-4
      [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-zinc-900 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-zinc-100
      [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_h3]:mt-6
      [&_p]:text-zinc-700
      [&_strong]:font-semibold [&_strong]:text-zinc-900
      [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2
      [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2
      [&_li]:marker:text-indigo-500
      [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:bg-indigo-50/50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:rounded-r-xl [&_blockquote]:text-zinc-700 [&_blockquote]:italic
      [&_code]:font-mono [&_code]:bg-zinc-100 [&_code]:text-indigo-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[13.5px]
      [&_pre]:bg-zinc-900 [&_pre]:text-zinc-100 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-zinc-800 [&_pre_code]:bg-transparent [&_pre_code]:text-zinc-100 [&_pre_code]:p-0
      [&_a]:text-indigo-600 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-indigo-800"
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
