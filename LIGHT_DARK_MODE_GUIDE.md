# Light/Dark Mode Implementation Guide

## Overview

The app now supports light/dark mode with automatic system preference detection and persistent user preferences. The implementation uses:

- **ThemeContext** (`src/hooks/useTheme.tsx`) - Central state management for theme
- **ThemeProvider** - Wraps the app and applies theme to DOM
- **ThemeToggle** (`src/components/ThemeToggle.tsx`) - Button to switch themes
- **CSS Variables** - Semantic color variables that change per theme (in `src/index.css`)

---

## Architecture

### 1. ThemeContext Hook (`src/hooks/useTheme.tsx`)

Manages theme state and persistence:

```typescript
export function useTheme(): ThemeContextType {
  const { theme, toggleTheme } = useTheme();
  // theme: 'light' | 'dark'
  // toggleTheme(): void - Switches theme and persists to localStorage
}
```

**Features:**
- Reads from `localStorage` on init
- Falls back to system preference (`prefers-color-scheme`)
- Applies `data-theme` attribute to `<html>` element
- Automatically syncs with theme changes

### 2. ThemeProvider Component

Wraps the app in `App.tsx`:

```tsx
<ThemeProvider>
  <NotepadProvider>
    {/* App content */}
  </NotepadProvider>
</ThemeProvider>
```

### 3. ThemeToggle Button (`src/components/ThemeToggle.tsx`)

A simple button that toggles between themes:
- Shows sun icon in light mode, moon icon in dark mode
- Smooth hover/active states
- Accessible with aria-label

### 4. CSS Variables System

#### Light Mode (Default)

```css
:root {
  --bg: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --text: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --border-color: #e5e7eb;
  --button-bg: #f3f4f6;
  --button-hover-bg: #e5e7eb;
  --surface-bg: #ffffff;
}
```

#### Dark Mode

```css
[data-theme="dark"] {
  --bg: #1a1a1a;
  --bg-secondary: #252525;
  --bg-tertiary: #2f2f2f;
  --text: #f0f0f0;
  --text-secondary: #b0b0b0;
  --text-tertiary: #808080;
  --border-color: #3a3a3a;
  --button-bg: #2f2f2f;
  --button-hover-bg: #3a3a3a;
  --surface-bg: #1f1f1f;
}
```

---

## Usage

### Using the Theme Context

```tsx
import { useTheme } from '../hooks/useTheme';

export function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### Styling with Theme Variables

Instead of hardcoding colors, use CSS variables:

```css
/* ✅ Good */
.my-component {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border-color);
}

/* ❌ Avoid */
.my-component {
  background: #ffffff;
  color: #111827;
  border: 1px solid #e5e7eb;
}
```

### Semantic Variables Reference

| Variable | Purpose | Light | Dark |
|----------|---------|-------|------|
| `--bg` | Primary background | #ffffff | #1a1a1a |
| `--bg-secondary` | Secondary background | #f9fafb | #252525 |
| `--bg-tertiary` | Tertiary background | #f3f4f6 | #2f2f2f |
| `--text` | Primary text | #111827 | #f0f0f0 |
| `--text-secondary` | Secondary text (muted) | #6b7280 | #b0b0b0 |
| `--text-tertiary` | Tertiary text (lighter) | #9ca3af | #808080 |
| `--border-color` | Default borders | #e5e7eb | #3a3a3a |
| `--button-bg` | Button background | #f3f4f6 | #2f2f2f |
| `--button-hover-bg` | Button hover state | #e5e7eb | #3a3a3a |
| `--surface-bg` | Surface/card background | #ffffff | #1f1f1f |

---

## Adding Dark Mode Support to New Components

### Step 1: Update CSS to use variables

```css
.my-new-component {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border-color);
  transition: background var(--transition-base), color var(--transition-base);
}

.my-new-component:hover {
  background: var(--bg-secondary);
}
```

### Step 2: No changes needed to JSX

The theme context automatically applies to all child components. Just use the CSS variables!

---

## How It Works

### On App Load

1. `ThemeProvider` initializes
2. Checks `localStorage` for saved theme
3. If not found, checks system preference via `window.matchMedia('(prefers-color-scheme: dark)')`
4. Sets initial theme and applies `data-theme` attribute to `<html>`
5. All CSS variables update automatically

### Theme Toggle Flow

1. User clicks `ThemeToggle` button
2. `toggleTheme()` invokes
3. Theme state updates in context
4. `localStorage` is updated
5. `data-theme` attribute on `<html>` changes
6. CSS variable overrides apply
7. Smooth transition animation occurs (via `transition` property)

### System Preference Sync

On initial load, if no saved preference exists, the app automatically respects the user's OS dark mode setting. Once the user toggles, their preference takes precedence.

---

## Customizing Colors

To adjust the theme colors, edit the CSS variables in `src/index.css`:

```css
:root {
  /* Light mode colors */
  --bg: #ffffff;
  --text: #111827;
  /* ... more colors ... */
}

[data-theme="dark"] {
  /* Dark mode colors */
  --bg: #1a1a1a;
  --text: #f0f0f0;
  /* ... more colors ... */
}
```

---

## Smooth Transitions

The theme switching includes smooth animations:

```css
html {
  transition: background-color var(--transition-base), color var(--transition-base);
}
```

Components can add their own transitions:

```css
.my-component {
  transition: background var(--transition-base), color var(--transition-base);
}
```

---

## Browser Support

- All modern browsers (Chrome, Firefox, Safari, Edge)
- localStorage for persistence
- CSS custom properties (CSS variables)
- `prefers-color-scheme` media query for system preferences

---

## Troubleshooting

### Theme Not Persisting

Check that `localStorage` is enabled in browser settings.

### Colors Not Changing

1. Verify `data-theme` attribute is on `<html>` in DevTools
2. Ensure CSS uses `var(--color)` instead of hardcoded values
3. Check browser cache (clear and reload)

### Transition Looks Jerky

- Ensure all colors use semantic variables
- Add `transition` property to affected elements
- Avoid rapidly toggling theme (debounce if needed)

---

## Files Modified

- **Created:** `src/hooks/useTheme.tsx` - ThemeContext and provider
- **Created:** `src/components/ThemeToggle.tsx` - Toggle button
- **Created:** `src/components/ThemeToggle.css` - Toggle button styles
- **Updated:** `src/index.css` - Added dark mode CSS variables
- **Updated:** `src/App.tsx` - Wrapped with ThemeProvider
- **Updated:** `src/App.css` - Updated to use semantic variables
- **Updated:** `src/components/Pipeline/PipelineShell.tsx` - Added ThemeToggle to header

---

## Dark Mode Refinement Tips

If you want to further refine the dark mode palette:

1. Use tools like [Coolors](https://coolors.co/) to create harmonious color palettes
2. Test readability with tools like [Contrast Ratio](https://contrast-ratio.com/)
3. Consider brand colors and how they appear in dark mode
4. Use softer shadows in dark mode (already done in this implementation)

Enjoy your new light/dark mode! 🌙✨
