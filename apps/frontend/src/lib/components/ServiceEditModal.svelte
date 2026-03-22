<script lang="ts">
	import { ApiClientError } from '$lib/api';
	import type { CreateServiceInput, Service, UpdateServiceInput } from '$lib/types';

	type ModalMode = 'create' | 'edit';

	interface ServiceEditModalProps {
		mode?: ModalMode;
		service: Service;
		show?: boolean;
		onCreate?: (input: CreateServiceInput) => Promise<void>;
		onUpdate?: (input: UpdateServiceInput) => Promise<void>;
	}

	let {
		mode = 'edit',
		service,
		show = $bindable(true),
		onCreate,
		onUpdate
	}: ServiceEditModalProps = $props();

	let name = $state('');
	let url = $state('');
	let description = $state('');
	let isSaving = $state(false);
	let errorMessage = $state<string | null>(null);
	let lastHydratedSignature = $state<string | null>(null);

	const isCreateMode = $derived(mode === 'create');
	const modalTitle = $derived(isCreateMode ? '新增服務' : '編輯服務');
	const saveLabel = $derived(isSaving ? '保存中...' : '保存');
	const isUrlDisabled = $derived(!isCreateMode || isSaving);
	const serviceSignature = $derived(
		`${mode}|${service.name}|${service.url}|${service.description ?? ''}|${show}`
	);

	$effect(() => {
		if (!show) {
			lastHydratedSignature = null;
			return;
		}

		if (serviceSignature === lastHydratedSignature) {
			return;
		}

		name = service.name;
		url = service.url;
		description = service.description ?? '';
		errorMessage = null;
		lastHydratedSignature = serviceSignature;
	});

	const toErrorMessage = (error: unknown): string => {
		if (error instanceof ApiClientError) {
			return error.message;
		}
		if (error instanceof Error) {
			return error.message;
		}
		return '無法儲存服務。';
	};

	function handleCancel() {
		if (isSaving) {
			return;
		}

		errorMessage = null;
		show = false;
	}

	const normalizeDescription = (value: string): string | undefined => {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	};

	async function handleSave() {
		if (isSaving) {
			return;
		}

		errorMessage = null;
		const trimmedName = name.trim();
		const trimmedUrl = url.trim();

		if (trimmedName.length === 0) {
			errorMessage = '服務名稱為必填項目。';
			return;
		}

		if (isCreateMode && trimmedUrl.length === 0) {
			errorMessage = '服務網址為必填項目。';
			return;
		}

		isSaving = true;
		try {
			if (isCreateMode) {
				if (!onCreate) {
					throw new Error('Create handler is not configured.');
				}
				await onCreate({
					name: trimmedName,
					url: trimmedUrl,
					description: normalizeDescription(description)
				});
			} else {
				if (!onUpdate) {
					throw new Error('Update handler is not configured.');
				}
				await onUpdate({
					name: trimmedName,
					description: normalizeDescription(description)
				});
			}
			show = false;
		} catch (error) {
			errorMessage = toErrorMessage(error);
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="absolute top-0 left-0 z-9 flex h-dvh w-dvw items-center justify-center bg-black/20">
	<div
		class="flex w-11/12 max-w-sm flex-col gap-4 rounded-lg border border-border bg-elevated px-6 py-4 text-text"
	>
		<h2 class="text-center text-2xl font-bold">{modalTitle}</h2>

		{#if errorMessage}
			<p
				class="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			>
				{errorMessage}
			</p>
		{/if}

		<label class="flex flex-col gap-2">
			名稱
			<input
				type="text"
				bind:value={name}
				class="h-10 rounded-lg border border-secondary px-2 py-1 text-lg transition-colors duration-300 ease-in-out
							focus:border-2 focus:outline-0"
				disabled={isSaving}
			/>
		</label>
		<label class="flex flex-col gap-2">
			連結
			<input
				type="text"
				bind:value={url}
				class="h-10 rounded-lg border border-secondary px-2 py-1 text-lg transition-colors duration-300 ease-in-out
							focus:border-2 focus:outline-0 {!isCreateMode ? 'text-muted' : ''}"
				disabled={isUrlDisabled}
			/>
		</label>
		<label class="flex flex-col gap-2">
			描述
			<input
				type="text"
				bind:value={description}
				class="h-10 rounded-lg border border-secondary px-2 py-1 text-lg transition-colors duration-300 ease-in-out
							focus:border-2 focus:outline-0"
				disabled={isSaving}
			/>
		</label>

		<div class="mt-2 flex flex-row justify-between text-lg">
			<button
				class="cursor-pointer rounded-lg border border-border bg-secondary px-4 py-1 transition-transform ease-in-out
							hover:scale-102"
				onclick={handleCancel}
				disabled={isSaving}
			>
				取消
			</button>
			<button
				class="cursor-pointer rounded-lg border border-border bg-primary px-4 py-1 duration-300 ease-in-out hover:scale-102"
				onclick={handleSave}
				disabled={isSaving}
			>
				{saveLabel}
			</button>
		</div>
	</div>
</div>
