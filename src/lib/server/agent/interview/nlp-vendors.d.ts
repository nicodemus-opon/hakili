/**
 * Ambient declarations for untyped small NLP deps (server-only).
 * `wink-ner` is a smart gazetteer NER; `wink-tokenizer` is its multilingual
 * tokenizer. Both are CommonJS factories used only from `entities-lite.ts`.
 */
declare module 'wink-ner' {
	export interface WinkLearnItem {
		text: string;
		entityType: string;
		uid?: string;
	}
	export interface WinkToken {
		value: string;
		tag: string;
		entityType?: string;
		originalSeq?: string[];
		uid?: string;
	}
	interface WinkNerInstance {
		learn(items: WinkLearnItem[]): void;
		recognize(tokens: WinkToken[]): WinkToken[];
	}
	const factory: (config?: unknown) => WinkNerInstance;
	export default factory;
}

declare module 'wink-tokenizer' {
	import type { WinkToken } from 'wink-ner';
	interface WinkTokenizerInstance {
		tokenize(text: string): WinkToken[];
	}
	const factory: () => WinkTokenizerInstance;
	export default factory;
}

declare module 'compromise-numbers' {
	/** Structural mirror of compromise's `Plugin` (all fields optional). */
	const plugin: {
		methods?: object;
		model?: object;
		compute?: object;
		hooks?: string[];
		tags?: object;
		words?: object;
	};
	export default plugin;
}
