---
name: frontend
description: >
  PingBoard frontend patterns. Use this skill whenever writing or modifying any
  frontend code in apps/frontend — including Svelte components, SvelteKit routes,
  Tailwind CSS styling, uptime bar charts, status indicators, API fetching,
  or dashboard UI. Trigger on: Svelte component, status page, uptime bar,
  dashboard, chart, Tailwind styles, +page.svelte, +layout.svelte, load function,
  or any apps/frontend file.
---

# PingBoard Frontend Skill

## Project Structure
```
apps/frontend/
├── src/
│   ├── app.d.ts                    # SvelteKit ambient types (Locals, PageData, etc.)
│   ├── lib/
│   │   ├── components/
│   │   │   ├── UptimeBar.svelte    # 90-day history bar (takes DaySummary[90])
│   │   │   ├── ServiceCard.svelte  # Card with name, status badge, uptime bar
│   │   │   └── StatusBadge.svelte  # up/down/unknown dot + label + latency
│   │   ├── api.ts                  # Typed fetch wrappers for worker API
│   │   └── types.ts                # Re-exports from @pingboard/shared
│   └── routes/
│       ├── register/
│       │   └── +page.svelte        # User register page
│       ├── login/
│       │   └── +page.svelte        # User login page
│       ├── layout.css              # Tailwind 4 @import + @theme design tokens
│       ├── +layout.svelte          # Root layout (font, nav shell)
│       ├── +page.svelte            # Status page
│       └── +page.ts                # Client load — fetches /api/status
├── vite.config.ts                  # sveltekit() + tailwindcss() plugins
└── svelte.config.js
```

Read the relevant source file before modifying. Do not reproduce an entire component when only one part needs changing.

---

## Critical Patterns (non-obvious)

### Svelte 5 Runes — Complete Replacement of Svelte 4 Reactivity
Svelte 5 runes are **not** backward-compatible with Svelte 4 syntax. Every reactive feature changed.

```svelte
<script lang="ts">
  // ❌ Svelte 4 — never use in this project
  export let value: string;
  let count = 0;
  $: doubled = count * 2;
  $: { console.log(count); }

  // ✅ Svelte 5 equivalents
  const { value } = $props<{ value: string }>();
  let count = $state(0);
  const doubled = $derived(count * 2);
  $effect(() => { console.log(count); });
</script>
```

| Svelte 4 | Svelte 5 | Notes |
|---|---|---|
| `export let x` | `$props<{x}>()` | Destructure immediately |
| `let x = 0` (reactive) | `$state(0)` | Only wrap reactive vars |
| `$: derived = expr` | `$derived(expr)` | Pure expression, no side effects |
| `$: { ... }` | `$effect(() => { ... })` | Return cleanup fn if needed |
| `<slot>` | `{@render children()}` | Snippets replace slots |

### Tailwind CSS 4 — CSS-First Config (no tailwind.config.js)
Tailwind 4 removes `tailwind.config.js`. All theme customization goes in `app.css`:

```css
/* app.css */
@import "tailwindcss";

@theme {
  --color-up: #22c55e;
  --color-down: #ef4444;
  --color-unknown: #6b7280;
  --color-degraded: #f59e0b;
}
/* Generates bg-up, text-up, border-up, etc. automatically */
```

`vite.config.ts` must use the Vite plugin (not PostCSS):
```ts
import tailwindcss from '@tailwindcss/vite'; // ← Tailwind 4 Vite plugin
import { sveltekit } from '@sveltejs/kit/vite';
export default defineConfig({ plugins: [tailwindcss(), sveltekit()] });
```

### $props with Optional / Default Values
```ts
// ✅ Optional prop with default
const { days, showLabels = true } = $props<{
  days: DaySummary[];
  showLabels?: boolean;
}>();

// ✅ Two-way bindable prop
let { value = $bindable('') } = $props<{ value?: string }>();
```

### SvelteKit Load — Client vs Server
- `+page.ts` → runs on client + SSR; use for public data
- `+page.server.ts` → server only; use for auth-gated data, secrets, direct DB access
- Never put API secrets or auth logic in `+page.ts`
