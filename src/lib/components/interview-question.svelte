<script lang="ts">
	import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Questionnaire from '#lib/components/ui/questionnaire/index.js';

	type InterviewChoice = { value: string; label: string };

	let {
		name,
		title,
		type,
		choices = [],
		required = false,
		description,
		selected,
		draft = $bindable(''),
		canGoBack = false,
		submitLabel = 'Continue',
		submitDisabled = false,
		onPick,
		onToggle,
		onPrevious,
		onSubmit
	}: {
		name: string;
		title: string;
		type: 'text' | 'single_choice' | 'multi_choice' | 'boolean' | 'date';
		choices?: InterviewChoice[];
		required?: boolean;
		description?: string;
		selected: string | string[];
		draft?: string;
		canGoBack?: boolean;
		submitLabel?: string;
		submitDisabled?: boolean;
		onPick: (value: string) => void;
		onToggle: (value: string) => void;
		onPrevious: () => void;
		onSubmit: () => void;
	} = $props();

	const items = $derived([{ name, required }]);
	const multiple = $derived(type === 'multi_choice');

	function isChecked(value: string): boolean {
		if (Array.isArray(selected)) return selected.includes(value);
		return selected === value;
	}

	function handleInput(e: Event) {
		draft = (e.target as HTMLInputElement).value;
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		onSubmit();
	}
</script>

<Questionnaire.Root {items} defaultItem={name} shortcuts="letters" onSubmit={handleSubmit}>
	<Questionnaire.Item {name} {required} {multiple}>
		<Questionnaire.Title>{title}</Questionnaire.Title>
		{#if description}
			<Questionnaire.Description>{description}</Questionnaire.Description>
		{/if}
		{#if type === 'single_choice' || type === 'boolean'}
			<Questionnaire.Choices>
				{#each choices as c (c.value)}
					<Questionnaire.Choice
						value={c.value}
						checked={isChecked(c.value)}
						onChange={() => onPick(c.value)}
					>
						{c.label}
					</Questionnaire.Choice>
				{/each}
				<Questionnaire.Input
					aria-label="Or type your own answer"
					placeholder="Or type your own answer…"
					value={draft}
					onChange={handleInput}
				/>
			</Questionnaire.Choices>
		{:else if type === 'multi_choice'}
			<Questionnaire.Choices>
				{#each choices as c (c.value)}
					<Questionnaire.Choice
						value={c.value}
						checked={isChecked(c.value)}
						onChange={() => onToggle(c.value)}
					>
						{c.label}
					</Questionnaire.Choice>
				{/each}
				<Questionnaire.Input
					aria-label="Add your own answer"
					placeholder="Add your own answer…"
					value={draft}
					onChange={handleInput}
				/>
			</Questionnaire.Choices>
		{:else if type === 'date'}
			<Questionnaire.Input type="date" aria-label={title} value={draft} onChange={handleInput} />
		{:else}
			<Questionnaire.Input
				aria-label={title}
				placeholder="Type your answer…"
				value={draft}
				onChange={handleInput}
			/>
		{/if}
		<Questionnaire.Error />
	</Questionnaire.Item>

	<Questionnaire.Actions>
		{#if canGoBack}
			<div class="col-start-1 row-start-1 justify-self-start">
				<Button variant="outline" onclick={onPrevious}>
					<ArrowLeftIcon />
					Back
				</Button>
			</div>
		{/if}
		<Questionnaire.Submit disabled={submitDisabled}>{submitLabel}</Questionnaire.Submit>
	</Questionnaire.Actions>
</Questionnaire.Root>
