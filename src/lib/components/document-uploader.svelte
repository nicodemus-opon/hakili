<script module lang="ts">
	// Shared across uploader instances: defineFilePond registers a global
	// custom element, so only the first mount should define it.
	let filePondDefined = false;
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import 'filepond/types/svelte';
	import type { FilePondElement, FilePondEntry } from 'filepond';
	import {
		ACCEPT_ATTR,
		MAX_DOCS,
		MAX_FILE_BYTES,
		UPLOAD_URL,
		dedupeFiles,
		extOf,
		formatBytes,
		isAcceptedFile,
		resolveStoredId,
		takeSummary,
		type StoredDetail,
		type UploadedDoc
	} from '#lib/filepond.ts';

	let {
		docs = $bindable<UploadedDoc[]>([]),
		onUploaded
	}: { docs?: UploadedDoc[]; onUploaded?: (doc: UploadedDoc) => void } = $props();

	let pondEl = $state<FilePondElement | null>(null);
	let pondReady = $state(false);
	let pondFailed = $state(false);
	let error = $state<string | null>(null);

	// Server ids this instance has seen as stored pond entries. Pruning
	// confirmed docs is restricted to these: a fresh mount (dialog reopen)
	// with an empty pond must never wipe docs confirmed earlier.
	let seenStored: string[] = [];

	// Fallback (no FilePond) queue state
	interface Queued {
		id: string;
		file: File;
		progress: number;
		status: 'queued' | 'uploading' | 'error';
		message?: string;
		xhr?: XMLHttpRequest | null;
	}
	let queue = $state<Queued[]>([]);
	let fallbackFiles = $state<FileList | undefined>(undefined);
	let initError = $state<string | null>(null);

	async function initPond(): Promise<void> {
		initError = null;
		pondFailed = false;
		try {
			await ensureFilePond();
			pondReady = true;
		} catch (e) {
			console.error('filepond init failed, using fallback', e);
			initError = e instanceof Error ? e.message : String(e);
			pondFailed = true;
		}
	}

	function retryPond(): void {
		pondReady = false;
		void initPond();
	}

	async function ensureFilePond(): Promise<void> {
		if (typeof window === 'undefined') throw new Error('FilePond needs a browser.');
		if (
			filePondDefined &&
			typeof customElements !== 'undefined' &&
			customElements.get('file-pond')
		) {
			return;
		}
		const [
			{ defineFilePond },
			{ locale },
			{ FormPostStore },
			{ DragDropSource },
			{ ClipboardSource },
			{ CameraSource },
			{ FileSizeValidator },
			{ ListCountValidator },
			{ ListSizeValidator },
			{ ObjectURLResource }
		] = await Promise.all([
			import('filepond'),
			import('filepond/locales/en-gb.js'),
			import('filepond/extensions/form-post-store.js'),
			import('filepond/extensions/drag-drop-source.js'),
			import('filepond/extensions/clipboard-source.js'),
			import('filepond/extensions/camera-source.js'),
			import('filepond/extensions/file-size-validator.js'),
			import('filepond/extensions/list-count-validator.js'),
			import('filepond/extensions/list-size-validator.js'),
			import('filepond/extensions/object-url-resource.js')
		]);
		try {
			defineFilePond({
				locale,
				extensions: [
					DragDropSource,
					ClipboardSource,
					CameraSource,
					FileSizeValidator,
					ListCountValidator,
					ListSizeValidator,
					ObjectURLResource,
					[
						FormPostStore,
						{
							url: UPLOAD_URL,
							name: 'file',
							fetchMetadata: false,
							shouldStore: () => true,
							resolveResponse: { store: resolveStoredId }
						}
					]
				]
			});
		} catch (e) {
			// A concurrent mount may have defined the element first; proceed if so.
			if (typeof customElements === 'undefined' || !customElements.get('file-pond')) throw e;
		}
		filePondDefined = true;
	}

	function entryServerId(e: FilePondEntry): string | null {
		const v = (e as { state?: Record<string, unknown> }).state?.value;
		return typeof v === 'string' && v ? v : null;
	}

	function entryFile(e: FilePondEntry): File | undefined {
		const f = (e as { file?: unknown }).file;
		return f instanceof File ? f : undefined;
	}

	function currentPending(): number {
		try {
			const entries = pondEl?.currentEntries;
			if (!Array.isArray(entries)) return 0;
			return entries.filter((e) => !entryServerId(e)).length;
		} catch {
			return 0;
		}
	}

	function syncFromEntries(entries: FilePondEntry[]): void {
		const stored = entries.filter((e) => entryServerId(e));
		// Dedupe silently (race-safe): only drop a pending entry when it
		// duplicates another pond entry, or when a STORED pond entry already
		// has that name (a genuine re-drop). Never drop a pending entry just
		// because the confirmed docs list has the name — it may be
		// mid-upload, with its server id not yet assigned.
		const storedNames: string[] = [];
		for (const e of stored) {
			const f = entryFile(e);
			if (f && !storedNames.includes(f.name)) storedNames.push(f.name);
		}
		const seenPending: string[] = [];
		for (const e of entries) {
			if (entryServerId(e)) continue;
			const f = entryFile(e);
			if (!f) continue;
			if (storedNames.includes(f.name)) {
				try {
					pondEl?.removeEntries(e.id);
				} catch {
					/* ignore */
				}
				continue;
			}
			const key = `${f.name}::${f.size}`;
			if (seenPending.includes(key)) {
				try {
					pondEl?.removeEntries(e.id);
				} catch {
					/* ignore */
				}
			} else {
				seenPending.push(key);
			}
		}
		let changed = false;
		const added: UploadedDoc[] = [];
		for (const e of stored) {
			const id = entryServerId(e);
			if (!id || docs.some((d) => d.id === id)) continue;
			if (docs.length >= MAX_DOCS) {
				try {
					pondEl?.removeEntries(e.id);
				} catch {
					/* ignore */
				}
				error = `You can attach up to ${MAX_DOCS} files.`;
				continue;
			}
			const cached = takeSummary(id);
			if (!seenStored.includes(id)) seenStored.push(id);
			const doc: UploadedDoc = {
				id,
				filename: cached?.filename ?? e.name ?? 'document',
				chars: cached?.chars ?? 0,
				chunks: cached?.chunks ?? 0
			};
			docs = [...docs, doc];
			added.push(doc);
			changed = true;
		}
		// Entries removed in FilePond (user clicked entry remove → FormPostStore
		// auto-DELETEs server-side): drop them from confirmed docs — but only
		// docs this instance has seen stored. A fresh mount (dialog reopen)
		// must never prune docs confirmed earlier. Skip while any upload is
		// in flight — the pond/docs lists are unsettled then.
		const pending = entries.length - stored.length;
		if (pending > 0) {
			if (changed) error = null;
			return;
		}
		for (const doc of added) onUploaded?.(doc);
		const storedIds = stored.map((e) => entryServerId(e) as string);
		const orphaned = docs.filter((d) => seenStored.includes(d.id) && !storedIds.includes(d.id));
		if (orphaned.length > 0) {
			const before = docs.length;
			docs = docs.filter((d) => storedIds.includes(d.id));
			if (docs.length !== before) changed = true;
		}
		if (changed) {
			error = null;
		}
	}

	function syncNow(): void {
		if (!pondEl) return;
		let entries: FilePondEntry[];
		try {
			entries = pondEl.currentEntries;
		} catch {
			return;
		}
		if (!Array.isArray(entries)) return;
		syncFromEntries(entries);
	}

	function onEntriesChange(ev: Event): void {
		const detail = (ev as CustomEvent<FilePondEntry[]>).detail;
		if (Array.isArray(detail)) syncFromEntries(detail);
		else syncNow();
	}

	onMount(() => {
		let cancelled = false;
		initPond().then(() => {
			if (cancelled) pondReady = false;
		});
		// Deterministic store-completion signal, dispatched from the
		// FormPostStore response resolver (FilePond DOM events don't reliably
		// fire when an entry's server id is set).
		function onStored(ev: Event): void {
			const detail = (ev as CustomEvent<StoredDetail>).detail;
			if (!detail?.id || docs.some((d) => d.id === detail.id)) return;
			if (docs.length >= MAX_DOCS) {
				error = `You can attach up to ${MAX_DOCS} files.`;
				return;
			}
			const cached = takeSummary(detail.id) ?? detail.summary;
			if (!seenStored.includes(detail.id)) seenStored.push(detail.id);
			const doc: UploadedDoc = {
				id: detail.id,
				filename: cached?.filename ?? detail.name ?? 'document',
				chars: cached?.chars ?? 0,
				chunks: cached?.chunks ?? 0
			};
			docs = [...docs, doc];
			error = null;
			// Only auto-close once nothing is left in flight; otherwise the
			// dialog unmount would cancel the remaining FilePond uploads.
			// syncFromEntries covers the batched case when entries settle.
			if (currentPending() === 0) onUploaded?.(doc);
		}
		window.addEventListener('filepond:stored', onStored);
		return () => {
			cancelled = true;
			window.removeEventListener('filepond:stored', onStored);
		};
	});

	$effect(() => {
		const el = pondEl;
		if (!el || !pondReady) return;
		try {
			el.accept = ACCEPT_ATTR;
			el.maxFiles = MAX_DOCS;
			el.maxSize = MAX_FILE_BYTES;
		} catch {
			/* attributes already set declaratively */
		}
		el.addEventListener('entrieschange', onEntriesChange);
		// `change` fires when the form value changes, i.e. when a stored
		// entry receives its server id. `entrieschange` alone can miss that.
		el.addEventListener('change', onEntriesChange);
		// Catch up on anything stored before listeners attached.
		syncNow();
		return () => {
			el.removeEventListener('entrieschange', onEntriesChange);
			el.removeEventListener('change', onEntriesChange);
		};
	});

	// Keep the pond in sync when docs change elsewhere (chat-list removal,
	// reset, session switch): drop pond entries whose server ids are gone.
	// FormPostStore release-DELETEs them server-side (idempotent).
	$effect(() => {
		const ids = docs.map((d) => d.id);
		const el = pondEl;
		if (!el || !pondReady) return;
		let stale: string[];
		try {
			stale = el.currentEntries
				.filter((e) => {
					const v = entryServerId(e);
					return v !== null && !ids.includes(v);
				})
				.map((e) => e.id);
		} catch {
			return;
		}
		if (stale.length > 0) {
			try {
				el.removeEntries(...stale);
			} catch {
				/* ignore */
			}
		}
	});

	// ---- Fallback uploader (FilePond unavailable) ----
	function enqueueFallback(): void {
		error = null;
		const picked = fallbackFiles ? Array.from(fallbackFiles) : [];
		if (!picked.length) {
			error = 'Choose a file first.';
			return;
		}
		const accepted: File[] = [];
		for (const f of dedupeFiles(picked)) {
			if (queue.some((q) => q.file.name === f.name && q.file.size === f.size)) {
				continue;
			}
			if (docs.some((d) => d.filename === f.name)) {
				continue;
			}
			const ext = extOf(f.name);
			if (!isAcceptedFile(f.name, f.type)) {
				error = `Unsupported file type ".${ext || '?'}". Attach a PDF, DOCX, TXT, Markdown or photo.`;
				continue;
			}
			if (f.size === 0) {
				error = `"${f.name}" is empty.`;
				continue;
			}
			if (f.size > MAX_FILE_BYTES) {
				error = `"${f.name}" is too large (${formatBytes(f.size)}). Keep files under 10 MB.`;
				continue;
			}
			accepted.push(f);
		}
		fallbackFiles = undefined;
		if (docs.length + queue.length + accepted.length > MAX_DOCS) {
			error = `You can attach up to ${MAX_DOCS} files.`;
			return;
		}
		for (const f of accepted) {
			queue = [...queue, { id: crypto.randomUUID(), file: f, progress: 0, status: 'queued' }];
		}
		void pumpQueue();
	}

	async function pumpQueue(): Promise<void> {
		if (queue.some((q) => q.status === 'uploading')) return;
		const next = queue.find((q) => q.status === 'queued');
		if (!next) return;
		if (docs.length >= MAX_DOCS) {
			error = `You can attach up to ${MAX_DOCS} files.`;
			return;
		}
		next.status = 'uploading';
		queue = [...queue];
		try {
			const summary = await uploadWithProgress(next);
			const doc: UploadedDoc = {
				id: summary.id,
				filename: summary.filename,
				chars: summary.chars,
				chunks: summary.chunks
			};
			docs = [...docs, doc];
			queue = queue.filter((q) => q.id !== next.id);
			if (!queue.some((q) => q.status === 'queued' || q.status === 'uploading')) {
				onUploaded?.(doc);
			}
			void pumpQueue();
		} catch (e) {
			next.status = 'error';
			next.message = e instanceof Error ? e.message : String(e);
			queue = [...queue];
		}
	}

	function uploadWithProgress(
		item: Queued
	): Promise<{ id: string; filename: string; chars: number; chunks: number }> {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			item.xhr = xhr;
			xhr.open('POST', UPLOAD_URL);
			xhr.upload.onprogress = (ev) => {
				if (ev.lengthComputable && ev.total > 0) {
					item.progress = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
					queue = [...queue];
				}
			};
			xhr.onload = () => {
				let data: {
					document?: { id: string; filename: string; chars: number; chunks: number };
					error?: string;
				} = {};
				try {
					data = JSON.parse(xhr.responseText) as typeof data;
				} catch {
					/* ignore */
				}
				if (xhr.status >= 200 && xhr.status < 300 && data.document) {
					item.progress = 100;
					resolve(data.document);
				} else {
					reject(new Error(data.error ?? `Upload failed (HTTP ${xhr.status}).`));
				}
			};
			xhr.onerror = () => reject(new Error('Upload failed: network error.'));
			xhr.onabort = () => reject(new Error('Upload cancelled.'));
			const form = new FormData();
			form.append('file', item.file);
			xhr.send(form);
		});
	}

	function cancelQueued(id: string): void {
		const item = queue.find((q) => q.id === id);
		item?.xhr?.abort();
		queue = queue.filter((q) => q.id !== id);
		void pumpQueue();
	}
</script>

<div class="flex flex-col gap-2">
	<Field.Field>
		{#if !pondFailed}
			{#if pondReady}
				<div class="filepond-wrap">
					<file-pond
						bind:this={pondEl}
						accept={ACCEPT_ATTR}
						multiple
						maxFiles={MAX_DOCS}
						maxSize={MAX_FILE_BYTES}
						noAttribution
					>
						<input type="file" name="file" accept={ACCEPT_ATTR} multiple />
					</file-pond>
				</div>
			{:else}
				<div class="flex flex-col gap-2" aria-hidden="true">
					<Skeleton class="h-28 w-full" />
				</div>
				<Field.Description>Loading uploader…</Field.Description>
			{/if}
		{:else}
			<div class="flex gap-2">
				<Input
					type="file"
					accept={ACCEPT_ATTR}
					bind:files={fallbackFiles}
					multiple
					aria-label="Choose files"
				/>
				<Button variant="outline" onclick={enqueueFallback}>Attach</Button>
				<Button variant="ghost" onclick={retryPond}>Try FilePond again</Button>
			</div>
			<Field.Description>
				{#if initError}
					Uploader failed to start ({initError}).
				{:else}
					Up to {MAX_DOCS} files · 10 MB each.
				{/if}
			</Field.Description>
			{#if queue.length > 0}
				<div class="flex flex-col gap-2 pt-1">
					{#each queue as q (q.id)}
						<div class="flex items-center gap-2">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm">{q.file.name}</p>
								<Progress value={q.progress} class="h-1.5" />
								{#if q.status === 'error' && q.message}
									<p class="text-xs text-destructive">{q.message}</p>
								{/if}
							</div>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => cancelQueued(q.id)}
								aria-label="Cancel {q.file.name}"
							>
								<XIcon />
							</Button>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</Field.Field>
	{#if error}
		<Alert variant="destructive">
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}
</div>

<style>
	.filepond-wrap {
		color-scheme: light;
	}
	:global(.dark) .filepond-wrap {
		color-scheme: dark;
	}
	/* Vars must sit on the <file-pond> element itself: FilePond's :host
	   defaults beat values inherited from ancestors. */
	.filepond-wrap :global(file-pond) {
		display: block;
		font-family: inherit;
		color-scheme: light;
		--default-font-family: inherit;
		--default-line-height: 1.5;
		--default-accent-color: var(--primary);
		--default-border-radius: var(--radius);
		--default-color: var(--foreground);
		--default-background-color: color-mix(in srgb, var(--foreground) 5%, var(--background) 95%);
	}
	:global(.dark) .filepond-wrap :global(file-pond) {
		color-scheme: dark;
	}
	/* Dropzone frame: soft dashed panel that matches the theme. */
	.filepond-wrap :global(file-pond::part(frame-element)) {
		border: 1.5px dashed color-mix(in srgb, var(--foreground) 25%, transparent);
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--foreground) 3%, transparent);
		padding: 1.25rem 1rem;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease;
	}
	.filepond-wrap :global(file-pond::part(frame-element):hover) {
		border-color: color-mix(in srgb, var(--primary) 60%, transparent);
	}
	.filepond-wrap :global(file-pond::part(drop-indicator)) {
		--border-radius: var(--radius);
	}
	/* Source buttons (Camera / Device): FilePond renders these inside
	   nested shadow roots with system Canvas colors by default, so they
	   ignore --default-* theme vars. Override the source-list host vars
	   via its exported element part, then style the buttons directly to
	   match shadcn Button secondary/sm. */
	.filepond-wrap :global(file-pond::part(source-list-element)) {
		--btn-color: var(--secondary-foreground);
		--btn-background-color: var(--secondary);
		--btn-border-radius: calc(var(--radius) - 2px);
		--btn-font-size: 0.875rem;
		--dialog-color: var(--popover-foreground);
		--dialog-background-color: var(--popover);
		--dialog-border-radius: var(--radius);
		--input-color: var(--foreground);
		--input-background-color: var(--background);
		--input-border: 1px solid var(--border);
		--input-border-radius: calc(var(--radius) - 2px);
		/* FilePond defaults this to `-.75em 0 .25em`, which pins the buttons
		   4px from the frame's bottom edge while the top gets a full 1em.
		   Keep the top pull-up, grow the bottom to 1em so the card breathes
		   evenly. (The frame is absolutely positioned behind the content,
		   so its own padding can't create this space.) */
		margin: -0.75em 0 1em;
	}
	.filepond-wrap :global(file-pond::part(source-list)) {
		gap: 0.5rem;
	}
	.filepond-wrap :global(file-pond::part(source-button)) {
		box-sizing: border-box;
		border: 1px solid var(--border);
		border-radius: calc(var(--radius) - 2px);
		background-color: var(--secondary);
		color: var(--secondary-foreground);
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
	}
	.filepond-wrap :global(file-pond::part(source-button):hover) {
		background-color: color-mix(in srgb, var(--secondary) 80%, var(--foreground) 20%);
	}
	.filepond-wrap :global(file-pond::part(source-button):focus-visible) {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	/* File rows: tidy cards with breathing room. */
	.filepond-wrap :global(file-pond::part(entry-list)) {
		--entry-border-radius: var(--radius);
		--entry-padding: 0.75em;
	}
	.filepond-wrap :global(file-pond::part(browse-button)) {
		--btn-border-radius: calc(var(--radius) - 2px);
	}
	.filepond-wrap :global(file-pond::part(entry-button)) {
		--btn-border-radius: 999px;
	}
</style>
