interface MarkdownTextProps {
  text: string;
  className?: string;
}

function renderInline(input: string): string {
  return input
    .replace(/`([^`]+)`/g, "<code class=\"rounded bg-black/25 px-1 py-0.5 text-[0.92em]\">$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

export default function MarkdownText({ text, className = "" }: MarkdownTextProps) {
  const lines = text.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        html.push("<ul class=\"list-disc pl-5 space-y-1\">");
        inList = true;
      }
      html.push(`<li>${renderInline(line.slice(2))}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInline(line)}</p>`);
  }

  closeList();

  return (
    <div
      className={`space-y-2 text-sm leading-relaxed text-foreground/90 ${className}`}
      dangerouslySetInnerHTML={{ __html: html.join("") }}
    />
  );
}
