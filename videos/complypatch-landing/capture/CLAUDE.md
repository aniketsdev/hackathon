# ComplyPatch AI

Source: http://127.0.0.1:3001/

To create a video from this capture, use the `website-to-hyperframes` skill.

## What's in This Capture

| File | Contents |
|------|----------|
| `screenshots/contact-sheet.jpg` | **View this first.** All scroll screenshots in labeled grid — see the entire page at a glance |
| `screenshots/scroll-*.png` | Individual viewport screenshots if you need detail on a specific section. |
| `extracted/tokens.json` | Design tokens: 14 colors, 6 fonts, 4 headings, 3 CTAs |
| `extracted/design-styles.json` | Computed styles from live DOM: typography hierarchy, button/card/nav styles, spacing scale, border-radius, box shadows. Primary data source for DESIGN.md. |
| `extracted/asset-descriptions.md` | One-line description of every downloaded asset. Read this for asset selection — only open individual files for safe-zone checking. |
| `extracted/visible-text.txt` | Page text in DOM order, prefixed with HTML tag (`[h1]`, `[p]`, `[a]`). Use as context — rephrase freely. |
| `assets/contact-sheet.jpg` | All downloaded images in one labeled grid. |
| `assets/svgs/contact-sheet.jpg` | SVGs rendered as thumbnails in labeled grid |
| `assets/` | Individual downloaded images, SVGs, and font files. |

## Brand Summary

- **Colors**: #111111 (surface-dark), #FFFFFF (bg-light), #F7F7F7 (bg-light), #343434 (neutral), #DBDBDB (surface-light), #C4C4C4 (surface-light), #FCFCFC (bg-light), #EEEEEE (bg-light), #E8E8E8 (bg-light), #999999 (neutral)
- **Fonts**: __nextjs-Geist (400-600 variable), __nextjs-Geist Mono (400-600 variable), Aptos (360,400,680,700,720,850), Aptos Display (720), Cascadia Code (700,820,850), Georgia (500)
