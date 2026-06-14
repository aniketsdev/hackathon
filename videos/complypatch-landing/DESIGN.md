# Design System

## Overview

ComplyPatch AI is a minimal technical landing page for a GitHub compliance review agent. The captured site uses a white grid canvas, oversized black product copy, thin grey dividers, and a compact evidence preview panel. The visual identity is restrained and developer-facing: crisp typography, square buttons, hard borders, and a monochrome risk-review interface. The page avoids decorative motion and uses product evidence as the primary visual asset.

## Colors

- **Primary Surface**: `#FFFFFF` - main canvas, navigation, cards, and content sections.
- **Soft Surface**: `#F7F7F7` - subdued app background and secondary surface tone.
- **Quiet Surface**: `#FCFCFC` - faint card and grid-adjacent surface.
- **Primary Ink**: `#111111` - hero headline, button fill, score panel, and strong text.
- **Deep Grey**: `#202020` - near-black support tone.
- **Body Grey**: `#343434` - navigation links and mid-emphasis text.
- **Muted Text**: `#505050` - paragraph and code text.
- **Label Grey**: `#707070` - all-caps labels and metadata.
- **Line Grey**: `#DBDBDB` - panel borders and section dividers.
- **Grid Grey**: `#E8E8E8` - subtle page grid and separators.

## Typography

- **Display**: Aptos Display, weight 720. Used for the hero headline at 136px on desktop, tight line-height, no letter spacing.
- **Editorial Heading**: Georgia, weight 500. Used for major section headlines at 92px, high contrast against the technical UI.
- **Interface Sans**: Aptos, weights 360, 400, 680, 700, 720, 850. Used for body copy, nav, buttons, and product panels.
- **Code / Metadata**: Cascadia Code, weights 700, 820, 850. Used for rules, file paths, repo URLs, and labels.

## Elevation

Depth is created through thin borders, large whitespace, and one restrained evidence-panel shadow. Most components are flat and square with `1px` grey dividers. The score panel uses `#111111` as the strongest contrast anchor instead of color-coded severity states.

## Components

- **Sticky Product Nav**: White bar, logo left, simple links right, black square console button.
- **Grid Hero Canvas**: Full-viewport white grid with oversized black headline and concise problem note.
- **PR Evidence Panel**: Square bordered product preview showing repository, PR title, rule evidence, file paths, and blocking score.
- **Problem Tiles**: Three flat bordered statements showing the compliance-review gap.
- **Workflow Grid**: Four numbered steps with sparse copy and quiet borders.
- **Proof Grid**: Three square cards summarizing scanner, AI risk language, and GitHub-native output.

## Do's and Don'ts

### Do's

- Use only white, black, and neutral greys from the captured palette.
- Keep the logo visible once in the opening frame, then let evidence panels carry the product story.
- Use square edges, thin borders, and generous whitespace.
- Use big type for the message and compact monospace labels for proof.
- Keep motion precise and UI-driven: slide, draw, type, count, and settle.

### Don'ts

- Do not add gradients, orbs, colored severity badges, or decorative glow fields.
- Do not use WebGL, Three.js, canvas backgrounds, or circular ambient motion.
- Do not round cards or buttons.
- Do not make the video feel like a marketing template; keep it like a product system demo.
- Do not obscure evidence text with animation or overlays.
