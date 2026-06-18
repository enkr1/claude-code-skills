---
name: md2pdf
description: Convert a Markdown file into a clean, print-ready PDF. Use whenever the user wants to turn a .md into a .pdf — submissions, tutorials, helpsheets, reports, notes, any markdown → PDF. Triggers on "md to pdf", "convert to pdf", "make/export a pdf", "print this markdown", or naming a .md and asking for a .pdf. Bundles a cross-browser pandoc + headless-Chromium pipeline that needs no LaTeX.
---

# md2pdf — Markdown → print-ready PDF

**Run the bundled script. Do NOT hand-type a pandoc/Chrome command each time.**

```bash
"$HOME/.claude/skills/md2pdf/scripts/md2pdf.sh" <input.md> [output.pdf]
```

(If invoked as a plugin, the same script is at
`"${CLAUDE_PLUGIN_ROOT}/skills/md2pdf/scripts/md2pdf.sh"`.)

## Usage

```bash
md2pdf.sh <input.md>                 # → <input>.pdf in the same folder
md2pdf.sh <input.md> <output.pdf>    # explicit output name (single file)
md2pdf.sh a.md b.md c.md             # batch: each → its own .pdf
```

## What it does for you

- **Engine:** pandoc → self-contained HTML (embeds the stylesheet) → headless
  Chromium `--print-to-pdf` (Producer: Skia/PDF). Chosen because no LaTeX engine
  is needed and Chromium gives nicer output than wkhtmltopdf with zero installs.
- **Checks:** warns on em dashes (—) and reports the page count, warning if it
  goes over 2 pages (handy for capped submissions).

## Customising

- **Style:** edit `scripts/md2pdf.css` to restyle every PDF. One-off override:
  `MD2PDF_CSS=/path/to/other.css md2pdf.sh file.md`.
- **Browser:** auto-detected (Chrome / Chromium / Brave / Edge / Canary, `.app`
  or on PATH). Force one with `CHROME_BIN=/path/to/browser`.

## Requirements

- `pandoc` (`brew install pandoc`)
- A Chromium-family browser (Chrome / Chromium / Brave / Edge)
- Optional: `pdfinfo` (poppler) for page counts; falls back to a pure-Python count.

## Typical flow (a graded submission)

1. Draft answers in the user's own voice (not polished AI prose).
2. Strip em dashes (the script warns if any remain).
3. `md2pdf.sh answers.md submission.pdf`
4. Confirm it is within the page cap, then the user uploads it.
