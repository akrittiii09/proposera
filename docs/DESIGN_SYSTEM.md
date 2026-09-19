# Design System Architecture: Proposera

## 1. Ergonomic Baseline & Invariants

The Proposera design system establishes the visual language, interaction patterns, and sensory ergonomics across both the **Creator Studio** and the **Recipient Experience**.

### 1.1 Requirements & Tagged Classifications

| Dimension | Specification & Rule | Classification Tag |
| :--- | :--- | :--- |
| **Mobile-First Orientation** | Recipient layout is designed primarily for vertical smartphone viewports (360px–430px wide), scaling gracefully up to tablets and desktops without letterboxing or loss of emotional focus. | `DESIGN-SYSTEM` |
| **Touch Ergonomics** | Interactive controls satisfy minimum touch bounding boxes (minimum 48x48 CSS px) with comfortable finger clearance for one-handed thumb interaction. | `DESIGN-SYSTEM` |
| **Keyboard & Focus** | All interactive elements are fully focusable with visible, high-contrast focus rings; full keyboard navigation support across scenes. | `DESIGN-SYSTEM` |
| **Semantic HTML** | Proper landmarks (`<main>`, `<nav>`, `<article>`, `<header>`), semantic headings (`<h1>` through `<h3>`), and semantic buttons (`<button>`). | `DESIGN-SYSTEM` |
| **Accessible Affirmative Target**| The proposal "Yes" action must be unambiguous, unobstructed, clear, and dignified. | `FEATURE-LEVEL` |
| **Contrast Standards** | All body text and narrative copy adhere to WCAG 2.1 AA contrast ratios (minimum 4.5:1 against surfaces; 3:1 for large display titles). | `DESIGN-SYSTEM` |
| **Reduced Motion Preference** | Strict adherence to `prefers-reduced-motion: reduce`. Disables continuous parallax, screen shakes, and particle physics in favor of elegant alpha crossfades. | `DESIGN-SYSTEM` |
| **No Manipulative UI Mechanics**| Zero dark patterns, no fleeing buttons, no deceitful interaction triggers. | `FEATURE-LEVEL` |

### 1.2 Domain-Scoped Requirements Breakdown

| Requirement Scope | Applicable Requirements & Ergonomic Constraints |
| :--- | :--- |
| **Platform-Wide Requirements** | - WCAG 2.1 AA contrast compliance (4.5:1 text, 3:1 display).<br>- Semantic HTML5 structure and valid ARIA landmark hierarchies.<br>- Full keyboard accessibility with clear focus rings.<br>- Strict `prefers-reduced-motion: reduce` compliance across all animation wrappers. |
| **Creator-Specific Requirements** | - Desktop & tablet productivity ergonomics (wide-form layout, dual-pane editor).<br>- Clear error states with `aria-describedby` associations.<br>- Accessible modal confirmation dialogs with keyboard focus traps.<br>- Real-time autosave indicators without jarring layout shifts. |
| **Recipient-Specific Requirements** | - Mobile-first vertical phone optimization (360px–430px primary viewport).<br>- Minimum 48x48px touch targets for all scene progression and interactive buttons.<br>- Distraction-free presentation (zero dashboard chrome, headers, or footers).<br>- Gentle, paced scene transitions with thumb-friendly navigation. |
| **Feature-Specific Requirements** | - **Proposal Reveal Scene**: High-contrast, dignified proposal question presentation.<br>- **Affirmative Interaction**: Unambiguous, accessible affirmative choice; zero fleeing or manipulative tricks.<br>- **Celebration Engine**: Dynamic confetti fireworks (gracefully degraded to static celebratory typography when reduced motion is preferred).<br>- **Audio Toggle**: Accessible persistent mute/play button with explicit screen-reader label. |

---

## 2. Environmental Baselines & Performance Budgets (PROPOSED)

> [!NOTE]
> Values in this section are **PROPOSED defaults** pending owner review and confirmation.

### 2.1 Target Device & Browser Baseline
- **Mobile Hardware**: Modern iOS (Safari on iOS 16+) and Android (Chrome/Firefox on Android 12+).
- **Desktop Hardware**: Safari, Chrome, Edge, Firefox (latest 2 major versions).
- **Network Profile**: Tested against simulated mobile 4G / 3G connections (emulated 1.5 Mbps down, 150ms RTT).

### 2.2 Recipient Performance Budget
- **Initial Document + Critical CSS**: $< 60\text{ KB}$ gzipped.
- **Total Initial JS Bundle (Recipient)**: $< 120\text{ KB}$ gzipped (no creator studio code shipped).
- **First Contentful Paint (FCP)**: $< 1.2\text{ s}$ on mobile 4G.
- **Cumulative Layout Shift (CLS)**: $< 0.05$ (guarantees romantic copy never jumps while images stream in).
- **Images**: Responsive WebP with explicit aspect-ratio containers to prevent layout reflow.

---

## 3. Design Token Architecture

Design tokens are categorized semantically to ensure that changing a theme modifies token definitions without modifying layout primitives.

> [!IMPORTANT]
> In accordance with the Phase 1 depth ceiling, tokens are specified by **category and naming taxonomy**, not concrete hex values, pixel sizes, or specific font families.

### 3.1 Token Categories
1. **Color & Surface Palette**:
   - `color.surface.canvas`: Base backdrop behind scenes.
   - `color.surface.card`: Elevated container for letters and milestones.
   - `color.surface.overlay`: Backdrop for modals and reveal focus.
   - `color.text.primary`: High-contrast narrative prose and questions.
   - `color.text.secondary`: Dates, milestone labels, captions.
   - `color.accent.primary`: Primary interactive elements, affirmative actions.
   - `color.accent.highlight`: Celebration sparks, romantic highlights.
2. **Typography Taxonomy**:
   - `typography.fontFamily.display`: Primary headline/romantic statement font.
   - `typography.fontFamily.body`: High-legibility narrative body font.
   - `typography.scale.*`: Standardized scale (`xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`, `hero`).
   - `typography.lineHeight.*`: Generous line height tokens ensuring reading comfort.
3. **Spatial & Layout Geometry**:
   - `space.*`: 4-point/8-point modular scale for padding, margins, and gaps.
   - `radius.*`: Border radii categories (`subtle`, `medium`, `pill`, `full`).
   - `elevation.*`: Shadow depth tokens (`flat`, `intimate`, `floating`).
4. **Motion & Transitions**:
   - `motion.duration.*`: Durations (`instant`, `quick`, `gentle`, `deliberate`, `pacing`).
   - `motion.easing.*`: Custom bezier curves (`standard`, `decelerate`, `emotional-spring`).

---

## 4. Component Primitives

### 4.1 Surface Cards (`Card`)
- **Purpose**: Frame relationship memories, photos, and letters.
- **Required States**: Default, Hover (desktop only), Active, Focus-within.

### 4.2 Interactive Buttons (`Button`)
- **Purpose**: Form triggers, scene navigation, and response submission.
- **Required Variants**:
  - `primary` (Affirmative proposal response, primary action).
  - `secondary` (Scene navigation, alternate gentle choice).
  - `ghost` (Media control toggle, subtle actions).
- **Required States**: Idle, Hover, Active, Focus-visible, Disabled, Loading/Submitting.

### 4.3 Form Inputs (`Input`, `Textarea`)
- **Purpose**: Creator Studio authoring fields (partner names, dates, long-form letters).
- **Required States**: Default, Filled, Focused, Error (with associated `aria-describedby` error text), Disabled.

### 4.4 Modal Dialogs (`Dialog`)
- **Purpose**: High-fidelity confirmations in Studio (e.g., Unpublish confirmation, Slug regeneration warning).
- **Required States**: Closed, Open, Focus-trapped, Closing.

### 4.5 Feedback & Notification States (`Alert`, `Banner`)
- **Purpose**: Surface operational status (e.g., autosave success, upload progress, validation issues).
- **Required States**: Informational, Success, Warning, Critical Error.

---

## 5. Motion Principles & Choreography

1. **Emotional Pacing Over Snappiness**: Unlike enterprise productivity software where 150ms instant snappy transitions dominate, Proposera utilizes gentle, breath-like motion curves (400ms–800ms) to evoke romance, intimacy, and presence.
2. **Sequential Scene Progression**: Scenes exit before subsequent scenes enter, avoiding overlapping visual noise on mobile screens.
3. **Celebration Orchestration**:
   - The affirmative response triggers an orchestrated celebration:
     1. Affirmative button pulses gently.
     2. Canvas transitions to celebratory lighting.
     3. Dynamic confetti bursts (or celebratory typography in reduced-motion mode).
     4. Closing heartfelt message fades into focus.

---

## 6. Theme Architecture & Invariant Enforcement

```
┌────────────────────────────────────────────────────────┐
│                   PROPOSAL CONTENT                     │
│  (Names, Dates, Photos, Letters, Proposal Question)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 UNIFIED SCENE ENGINE                   │
│   ┌────────────────────────────────────────────────┐   │
│   │                 Active Theme                   │   │
│   │  ┌──────────────┐ ┌──────────────┐ ┌─────────┐ │   │
│   │  │   Tokens     │ │ Components   │ │ Motion  │ │   │
│   │  └──────────────┘ └──────────────┘ └─────────┘ │   │
│   └────────────────────────────────────────────────┘   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            RENDERED RECIPIENT EXPERIENCE               │
└────────────────────────────────────────────────────────┘
```

- **Theme Interface**: A theme is defined as a cohesive implementation of semantic design tokens and specialized scene styling wrappers.
- **Zero Content Knowledge**: Themes ingest standardized semantic data contracts. They never manipulate or persist content.
- **Theme Switching Guarantee**: If a creator selects a new theme, the Scene Engine instantly replaces the theme provider wrapper. The underlying content is untouched, perfectly preserved, and completely uncorrupted.
