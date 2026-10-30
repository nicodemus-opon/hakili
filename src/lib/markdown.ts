function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function renderInline(s: string): string {
	// `s` must already be HTML-escaped. Apply inline markdown transforms.
	let out = s;

	// Inline code first so inner content is not further parsed.
	out = out.replace(/`([^`\n]+?)`/g, (_m, code: string) => {
		return `<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">${code}</code>`;
	});

	// Links [text](url) — only allow http(s), mailto, and relative URLs.
	out = out.replace(/\[([^\]\n]+?)\]\(([^)\s]+?)\)/g, (_m, text: string, rawUrl: string) => {
		const url = rawUrl.trim();
		const safe = /^(https?:\/\/|mailto:|#|\/)/i.test(url);
		if (!safe) return text;
		const href = escapeHtml(url).replace(/&amp;/g, '&');
		return `<a class="text-primary underline underline-offset-2 hover:text-foreground" target="_blank" rel="noreferrer" href="${href}">${text}</a>`;
	});

	// Bold **text** and __text__
	out = out.replace(/\*\*([^*`\n]+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
	out = out.replace(/__([^_`\n]+?)__/g, '<strong class="font-semibold">$1</strong>');

	// Italic *text* and _text_ (after bold so ** is not double-matched)
	out = out.replace(/(^|[^*\w])\*([^*\n]+?)\*/g, '$1<em>$2</em>');
	out = out.replace(/(^|[^\w])_([^_\n]+?)_/g, '$1<em>$2</em>');

	return out;
}

interface MarkdownBlock {
	type: 'heading' | 'ul' | 'ol' | 'para' | 'quote' | 'hr';
	level?: number;
	items?: string[];
	lines?: string[];
}

export type InlineToken = { type: 'text'; value: string } | { type: 'cite'; n: number };

const CITATION_RE = /\[(\d+)\](?!\()/g;
const CODE_SPAN_RE = /(`[^`\n]+?`)/g;
const LINK_SPAN_RE = /(\[[^\]\n]+?\]\([^)\s]+?\))/g;

/**
 * Split inline source into text runs and `[N]` citation markers.
 * Markers inside inline code spans or markdown links are left as plain
 * text so `` `[1]` `` and `[1](https://…)` keep rendering literally.
 */
export function splitInlineCitations(source: string): InlineToken[] {
	const tokens: InlineToken[] = [];
	for (const codePart of source.split(CODE_SPAN_RE)) {
		if (!codePart) continue;
		if (codePart.startsWith('`')) {
			tokens.push({ type: 'text', value: codePart });
			continue;
		}
		for (const linkPart of codePart.split(LINK_SPAN_RE)) {
			if (!linkPart) continue;
			if (linkPart.startsWith('[') && linkPart.includes('](')) {
				tokens.push({ type: 'text', value: linkPart });
				continue;
			}
			let last = 0;
			CITATION_RE.lastIndex = 0;
			for (let m = CITATION_RE.exec(linkPart); m; m = CITATION_RE.exec(linkPart)) {
				if (m.index > last) tokens.push({ type: 'text', value: linkPart.slice(last, m.index) });
				tokens.push({ type: 'cite', n: Number(m[1]) });
				last = m.index + m[0].length;
			}
			if (last < linkPart.length) tokens.push({ type: 'text', value: linkPart.slice(last) });
		}
	}
	return tokens;
}

/** Escape raw text, then apply inline markdown transforms (bold, links, code…). */
export function renderInlineSource(source: string): string {
	return renderInline(escapeHtml(source));
}

/**
 * Parse markdown source into blocks. Shared by the HTML string renderer
 * and the Svelte block renderer (which interleaves citation components).
 */
export function parseBlocks(source: string): MarkdownBlock[] {
	const normalized = source.replace(/\r\n?/g, '\n');
	const lines = normalized.split('\n');

	const blocks: MarkdownBlock[] = [];
	let para: string[] = [];

	const flushPara = () => {
		if (para.length) {
			blocks.push({ type: 'para', lines: para });
			para = [];
		}
	};

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!trimmed) {
			flushPara();
			i += 1;
			continue;
		}

		const heading = trimmed.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/);
		if (heading) {
			flushPara();
			blocks.push({
				type: 'heading',
				level: heading[1].length,
				lines: [heading[2]]
			});
			i += 1;
			continue;
		}

		if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) {
			flushPara();
			blocks.push({ type: 'hr' });
			i += 1;
			continue;
		}

		const quote = line.match(/^\s*>\s?(.*)$/);
		if (quote) {
			flushPara();
			const qlines: string[] = [];
			while (i < lines.length) {
				const qm = lines[i].match(/^\s*>\s?(.*)$/);
				if (!qm) break;
				qlines.push(qm[1]);
				i += 1;
			}
			blocks.push({ type: 'quote', lines: qlines });
			continue;
		}

		const ul = line.match(/^\s*[-*]\s+(.+)$/);
		if (ul) {
			flushPara();
			const items: string[] = [];
			while (i < lines.length) {
				const cur = lines[i];
				if (!cur.trim()) {
					// Blank line: stay in the same list only if another
					// bullet follows after the gap; otherwise end the list.
					let j = i + 1;
					while (j < lines.length && !lines[j].trim()) j += 1;
					if (j < lines.length && /^\s*[-*]\s+.+$/.test(lines[j])) {
						i = j;
						continue;
					}
					break;
				}
				const m = cur.match(/^\s*[-*]\s+(.+)$/);
				if (m) {
					items.push(m[1]);
					i += 1;
					continue;
				}
				// Wrapped description lines (indented or lazy continuation)
				// belong to the current item; any other block ends the list.
				if (
					/^(#{1,4})\s+.+/.test(cur.trim()) ||
					/^(-{3,}|\*{3,}|_{3,})\s*$/.test(cur.trim()) ||
					/^\s*>\s?(.*)$/.test(cur) ||
					/^\s*\d+[.)]\s+.+$/.test(cur) ||
					/^\s*\[\d+\]\s+.+$/.test(cur)
				) {
					break;
				}
				items[items.length - 1] += ' ' + cur.trim();
				i += 1;
			}
			blocks.push({ type: 'ul', items });
			continue;
		}

		const ol = line.match(/^\s*\d+[.)]\s+(.+)$/);
		const bracketOl = line.match(/^\s*\[\d+\]\s+(.+)$/);
		if (ol || bracketOl) {
			flushPara();
			const items: string[] = [];
			const isOlItem = (s: string) => /^\s*\d+[.)]\s+.+$/.test(s) || /^\s*\[\d+\]\s+.+$/.test(s);
			while (i < lines.length) {
				const cur = lines[i];
				if (!cur.trim()) {
					// Blank line: stay in the same list only if another
					// numbered item follows after the gap; otherwise end it.
					let j = i + 1;
					while (j < lines.length && !lines[j].trim()) j += 1;
					if (j < lines.length && isOlItem(lines[j])) {
						i = j;
						continue;
					}
					break;
				}
				const m = cur.match(/^\s*\d+[.)]\s+(.+)$/) ?? cur.match(/^\s*\[\d+\]\s+(.+)$/);
				if (m) {
					items.push(m[1]);
					i += 1;
					continue;
				}
				// Wrapped description lines (indented or lazy continuation)
				// belong to the current item; any other block ends the list.
				if (
					/^(#{1,4})\s+.+/.test(cur.trim()) ||
					/^(-{3,}|\*{3,}|_{3,})\s*$/.test(cur.trim()) ||
					/^\s*>\s?(.*)$/.test(cur) ||
					/^\s*[-*]\s+.+$/.test(cur)
				) {
					break;
				}
				items[items.length - 1] += ' ' + cur.trim();
				i += 1;
			}
			blocks.push({ type: 'ol', items });
			continue;
		}

		para.push(line.trim());
		i += 1;
	}
	flushPara();
	return blocks;
}

/**
 * Minimal, dependency-free markdown renderer for LLM-generated plans.
 * Supports headings, bullet/numbered lists, blockquotes, bold/italic,
 * inline code, links, and paragraphs. All raw HTML is escaped.
 */
export function renderMarkdown(source: string): string {
	const blocks = parseBlocks(source);

	return blocks
		.map((b) => {
			switch (b.type) {
				case 'heading': {
					const level = Math.min(Math.max(b.level ?? 2, 1), 4);
					const text = renderInline(escapeHtml((b.lines ?? [''])[0]));
					if (level === 1)
						return `<h1 class="mt-5 mb-1.5 text-lg font-semibold tracking-tight first:mt-0">${text}</h1>`;
					if (level === 2)
						return `<h2 class="mt-5 mb-1.5 text-base font-semibold tracking-tight first:mt-0">${text}</h2>`;
					return `<h3 class="mt-4 mb-1 text-sm font-semibold first:mt-0">${text}</h3>`;
				}
				case 'ul':
					return `<ul class="list-disc space-y-1 pl-6 text-sm">${(b.items ?? [])
						.map((it) => `<li class="leading-relaxed">${renderInline(escapeHtml(it))}</li>`)
						.join('')}</ul>`;
				case 'ol':
					return `<ol class="list-decimal space-y-1 pl-6 text-sm">${(b.items ?? [])
						.map((it) => `<li class="leading-relaxed">${renderInline(escapeHtml(it))}</li>`)
						.join('')}</ol>`;
				case 'quote': {
					const inner = (b.lines ?? []).map((l) => renderInline(escapeHtml(l))).join('<br />');
					return `<blockquote class="border-l-2 pl-4 text-sm text-muted-foreground border-border">${inner}</blockquote>`;
				}
				case 'hr':
					return `<hr class="my-4 border-border" />`;
				case 'para':
				default: {
					const inner = (b.lines ?? []).map((l) => renderInline(escapeHtml(l))).join('<br />');
					return `<p class="text-sm leading-relaxed">${inner}</p>`;
				}
			}
		})
		.join('\n');
}
