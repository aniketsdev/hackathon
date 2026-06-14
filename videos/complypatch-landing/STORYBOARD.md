# Storyboard

**Format:** 1920x1080
**Audio:** Optional TTS voiceover; no music required for first preview
**VO direction:** Calm, direct, technical. Short pauses after each sentence.
**Style basis:** `DESIGN.md` and captured site assets in `capture/`

## Asset Audit

| Asset | Type | Assign to Beat | Role |
| --- | --- | --- | --- |
| `capture/assets/svgs/brand-mark.svg` | SVG logo | Beat 1, Beat 4 | Brand mark opener and closer |
| `capture/screenshots/scroll-000.png` | Website screenshot | Beat 1, Beat 2 | Hero/product preview source |
| `capture/screenshots/scroll-033.png` | Website screenshot | Beat 3 | Problem/proof section source |
| `capture/screenshots/scroll-066.png` | Website screenshot | Beat 3 | Workflow and proof source |

## Global Direction

The video should feel like a product system coming into focus, not an ad template. Every frame stays white and grey with black as the primary emphasis. Use per-word typography, SVG line drawing, character typing, score count-up, and velocity-matched transitions. Avoid WebGL, Three.js, canvas backgrounds, circular motion, rounded cards, colored badges, and decorative gradients.

## Beat 1 - Hook: The Gate Appears (0.00-3.60s)

**VO cue:** "Stop risky pull requests before they merge."

**Concept:** The viewer enters the same white grid as the landing page. The logo is present once, small and precise, then the headline takes over the frame. The product is introduced as a clean gate, not a noisy dashboard.

**Visual description:** The brand mark draws in as a monochrome SVG path at top left. The words "Stop risky pull requests" land with staggered kinetic typography, followed by "before they merge." The captured hero screenshot sits faintly in the background as a cropped architectural reference, but the text remains dominant.

**Mood direction:** Codex-like minimalism. Strong type, sparse UI, exact spacing.

**Assets:** `capture/assets/svgs/brand-mark.svg`, `capture/screenshots/scroll-000.png`.

**Animation choreography:** Logo DRAWS. Headline words CASCADE. Screenshot DRIFTS upward by a few pixels. Thin grid lines FADE into view.

**Transition:** Velocity-matched upward into Beat 2.

**Depth layers:** BG white grid; MG faint captured hero screenshot; FG logo and headline.

**SFX cues:** Optional single soft click when the final word lands.

## Beat 2 - Evidence: The PR Becomes Reviewable (3.60-7.80s)

**VO cue:** "ComplyPatch watches GitHub webhooks, scans the changed code, and turns compliance risk into evidence."

**Concept:** The PR evidence panel becomes the hero. It is not abstract compliance; it is file paths, rules, score, and merge state.

**Visual description:** A square product panel slides into the center with repository, PR title, three findings, and a black score band. Rule rows type in one at a time. The score counts from 100 down to 12, then the word "blocking" stamps in the corner.

**Mood direction:** Technical, exact, review-room calm.

**Assets:** `capture/screenshots/scroll-000.png` as a reference screenshot behind the recreated panel.

**Animation choreography:** Panel SLIDES. Rule rows TYPE. Score COUNTS DOWN. Blocking label STAMPS. File paths SHARPEN from grey to black.

**Transition:** Blur-through CSS transition into Beat 3.

**Depth layers:** BG white grid; MG evidence panel; FG score and blocking label.

**SFX cues:** Three quiet ticks for the findings; one low thump when score resolves.

## Beat 3 - Risks: What It Catches (7.80-11.80s)

**VO cue:** "Secrets. Patient logs. Missing auth. Unsafe SQL."

**Concept:** The risk list is treated as a clean compliance checklist. No red warning colors. The danger comes from evidence, not decoration.

**Visual description:** Four tall bordered cards appear across the frame. Each card has a monospace rule label, a short risk phrase, and a file/evidence line. A thin SVG connector path draws between cards, implying a scan path through the diff.

**Mood direction:** Audit-grade, monochrome, sharp.

**Assets:** `capture/screenshots/scroll-033.png`, `capture/screenshots/scroll-066.png` as subtle background strips.

**Animation choreography:** Cards CASCADE. Connector path DRAWS. Evidence lines TYPE. Background strips DRIFT slowly.

**Transition:** Hard cut on the final word into Beat 4.

**Depth layers:** BG pale section screenshot strips; MG risk cards; FG drawn connector line.

**SFX cues:** Short mechanical tick per card.

## Beat 4 - CTA: Comment Before Merge (11.80-15.50s)

**VO cue:** "The review comment is ready before the merge button is. Open the console. Connect the webhook. Let every pull request prove it is safe."

**Concept:** The final frame closes the loop from webhook to comment. It should look like a product handoff, not a sales splash.

**Visual description:** A PR comment preview opens on the left while the CompliPatch wordmark and console button settle on the right. The final line "prove it is safe" becomes the held message. The frame ends with a stable static composition so the user can read the CTA.

**Mood direction:** Minimal product launch closer.

**Assets:** `capture/assets/svgs/brand-mark.svg`.

**Animation choreography:** Comment panel OPENS. CTA SLIDES into place. Logo FADES in. Final line HOLDS.

**Transition:** Final fade to white after the hold.

**Depth layers:** BG white grid; MG PR comment preview; FG logo, CTA, final line.

**SFX cues:** Soft paper-like slide for comment opening; quiet final click on CTA.

## Production Architecture

```
videos/complypatch-landing/
├── index.html
├── DESIGN.md
├── SCRIPT.md
├── STORYBOARD.md
├── capture/
│   ├── screenshots/
│   ├── assets/
│   └── extracted/
└── compositions/
    ├── beat-1-hook.html
    ├── beat-2-evidence.html
    ├── beat-3-risks.html
    └── beat-4-cta.html
```
