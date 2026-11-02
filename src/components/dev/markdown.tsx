import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink } from "@/components/external-link";

/**
 * A tiny renderer for the limited markdown CHANGELOG.md uses: headings,
 * paragraphs, bullet lists (nested by two-space indents), **bold**, *italic*,
 * `code` and [links](url). It builds React elements directly, so text is
 * always escaped by React and no raw HTML ever reaches the page.
 */

type ListItem = { text: string; children: ListItem[] };
type Block =
  | { kind: "heading"; level: 3 | 4 | 5 | 6; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: ListItem[] };

const LIST_ITEM = /^(\s*)[-*+] +(.*)$/;
const HEADING = /^(#{1,6}) +(.+?)\s*#*\s*$/;

function parseBlocks(source: string): Block[] {
  const lines = source.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || /^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      i++;
      continue;
    }
    const heading = line.match(HEADING);
    if (heading) {
      // Notes sit under a version's h2, so their headings start at h3.
      const level = Math.min(6, Math.max(3, heading[1].length + 1)) as 3 | 4 | 5 | 6;
      blocks.push({ kind: "heading", level, text: heading[2] });
      i++;
      continue;
    }
    if (LIST_ITEM.test(line)) {
      const root: ListItem[] = [];
      // Stack of [indent, list] pairs; the deepest open list is last.
      const stack: { indent: number; items: ListItem[] }[] = [{ indent: -1, items: root }];
      while (i < lines.length) {
        const m = lines[i].match(LIST_ITEM);
        if (!m) {
          // A non-blank, indented line continues the previous item.
          if (lines[i].trim() && /^\s+/.test(lines[i]) && stack.length > 1) {
            const items = stack[stack.length - 1].items;
            items[items.length - 1].text += ` ${lines[i].trim()}`;
            i++;
            continue;
          }
          break;
        }
        const indent = m[1].replace(/\t/g, "  ").length;
        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
        // Deeper than the open item: nest under it. Otherwise it's a sibling at this level.
        const item: ListItem = { text: m[2], children: [] };
        stack[stack.length - 1].items.push(item);
        stack.push({ indent, items: item.children });
        i++;
      }
      blocks.push({ kind: "list", items: root });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !LIST_ITEM.test(lines[i]) && !HEADING.test(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ kind: "paragraph", text: para.join(" ") });
  }
  return blocks;
}

// Code spans first (their contents are literal), then links, bold, italic.
const INLINE = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])|(?<![_\w])_(?!\s)(.+?)(?<!\s)_(?![_\w])/g;

function safeHref(href: string): string | null {
  if (/^(https?:|mailto:)/i.test(href)) return href;
  if (/^[/#]/.test(href) && !href.startsWith("//")) return href;
  return null;
}

function renderInline(text: string, keyPrefix = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyPrefix}-${n++}`;
    if (m[1] !== undefined) {
      out.push(
        <code key={key} className="rounded bg-surface px-1 py-0.5 font-mono text-[0.9em]">
          {m[1]}
        </code>,
      );
    } else if (m[2] !== undefined) {
      const href = safeHref(m[3]);
      const children = renderInline(m[2], key);
      if (!href) out.push(<span key={key}>{children}</span>);
      else if (/^[/#]/.test(href))
        out.push(
          <Link key={key} href={href} className="text-link">
            {children}
          </Link>,
        );
      else
        out.push(
          <ExternalLink key={key} href={href} className="text-link">
            {children}
          </ExternalLink>,
        );
    } else if (m[4] !== undefined) {
      out.push(
        <strong key={key} className="font-semibold">
          {renderInline(m[4], key)}
        </strong>,
      );
    } else {
      out.push(<em key={key}>{renderInline(m[5] ?? m[6], key)}</em>);
    }
    last = start + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function List({ items, depth }: { items: ListItem[]; depth: number }) {
  return (
    <ul className={`list-disc space-y-1.5 pl-5 ${depth > 0 ? "mt-1.5 list-[circle]" : ""}`}>
      {items.map((item, i) => (
        <li key={i}>
          {renderInline(item.text)}
          {item.children.length ? <List items={item.children} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function Markdown({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className="space-y-3 text-pretty">
      {blocks.map((block, i) => {
        if (block.kind === "list") return <List key={i} items={block.items} depth={0} />;
        if (block.kind === "heading") {
          const H = `h${block.level}` as const;
          return (
            <H key={i} className="pt-2 font-display text-lg font-semibold tracking-tight">
              {renderInline(block.text)}
            </H>
          );
        }
        return (
          <p key={i} className="max-w-prose">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
