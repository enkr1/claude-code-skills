#!/usr/bin/env bash
#
# md2pdf.sh — Convert Markdown to a clean, print-ready PDF.
#
# Pipeline (fixed in one place so we never hand-type it again):
#   pandoc  →  self-contained HTML (embeds the print stylesheet)
#   Chromium-family browser --print-to-pdf  →  PDF   (Producer: Skia/PDF)
#
# Why this stack: no LaTeX engine is installed, so pandoc can't emit PDF
# directly. A headless Chromium renderer gives nicer typography than
# wkhtmltopdf and needs nothing extra installed.
#
# Usage:
#   md2pdf.sh <input.md>                         # → <input>.pdf (same dir)
#   md2pdf.sh <input.md> <output.pdf>            # explicit output (single file)
#   md2pdf.sh a.md b.md c.md                     # batch: each → its own .pdf
#
# Styling:
#   Edit bin/md2pdf.css to restyle every PDF. Override per-run with
#   MD2PDF_CSS=/path/to/other.css. If the css file is missing, a built-in
#   copy is used so the script still works.
#
# Browser:
#   Auto-detected (Chrome / Chromium / Brave / Edge / Canary, .app or on PATH).
#   Force a specific one with CHROME_BIN=/path/to/browser.
#
# Per-file checks: warns on em dashes (—, house rule) and reports page count.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

die() { echo "error: $*" >&2; exit 1; }

[[ $# -ge 1 ]] || die "usage: md2pdf.sh <input.md> [output.pdf | more inputs...]"

command -v pandoc >/dev/null 2>&1 || die "pandoc not installed (brew install pandoc)"

# --- locate a Chromium-family browser (future-proof: many fallbacks) ----------
find_browser() {
  if [[ -n "${CHROME_BIN:-}" ]]; then
    [[ -x "$CHROME_BIN" ]] && { echo "$CHROME_BIN"; return 0; }
    die "CHROME_BIN set but not executable: $CHROME_BIN"
  fi
  local app candidates=(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
  )
  for app in "${candidates[@]}"; do [[ -x "$app" ]] && { echo "$app"; return 0; }; done
  local bin
  for bin in google-chrome google-chrome-stable chromium chromium-browser brave-browser microsoft-edge; do
    command -v "$bin" >/dev/null 2>&1 && { command -v "$bin"; return 0; }
  done
  return 1
}
BROWSER="$(find_browser)" || die "no Chromium-family browser found; set CHROME_BIN=/path/to/browser"

# --- resolve the stylesheet (external preferred, built-in fallback) -----------
CSS_FILE="${MD2PDF_CSS:-$SCRIPT_DIR/md2pdf.css}"
CSS_TMP=""
if [[ ! -f "$CSS_FILE" ]]; then
  CSS_TMP="$(mktemp -t md2pdf-css).css"
  cat > "$CSS_TMP" <<'CSS_EOF'
@page { size: A4; margin: 1.6cm; }
body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; font-size: 11pt; line-height: 1.42; color: #111; margin: 0; }
h1 { font-size: 15pt; margin: 0 0 4px; }
h2 { font-size: 12.5pt; margin: 14px 0 4px; }
h3 { font-size: 11.5pt; margin: 10px 0 3px; }
p, li { margin: 4px 0; }
table { border-collapse: collapse; width: 100%; font-size: 9.7pt; margin: 6px 0; }
th, td { border: 1px solid #888; padding: 4px 6px; text-align: left; vertical-align: top; }
th { background: #f0f0f0; }
blockquote { margin: 6px 0; padding: 2px 12px; border-left: 3px solid #ccc; color: #333; }
CSS_EOF
  CSS_FILE="$CSS_TMP"
fi
trap '[[ -n "$CSS_TMP" ]] && rm -f "$CSS_TMP"' EXIT

# --- decide single-explicit-output vs batch -----------------------------------
# Single mode only when exactly two args and the 2nd ends in .pdf.
declare -a INPUTS
EXPLICIT_OUT=""
if [[ $# -eq 2 && "$2" == *.pdf ]]; then
  INPUTS=("$1"); EXPLICIT_OUT="$2"
else
  INPUTS=("$@")
fi

render_one() {
  local in="$1" out="$2"
  [[ -f "$in" ]] || { echo "skip: not found: $in" >&2; return 1; }

  # Absolute output path (Chrome --print-to-pdf requires one).
  local out_dir; out_dir="$(cd "$(dirname "$out")" && pwd)"
  out="$out_dir/$(basename "$out")"

  if grep -q "—" "$in"; then
    echo "⚠️  em dash (—) in $in — strip before submitting (house rule)." >&2
  fi

  local html; html="$(mktemp -t md2pdf-html).html"
  pandoc "$in" -s -c "$CSS_FILE" --embed-resources \
    --metadata title="$(basename "${in%.*}")" -o "$html"

  # Try the modern headless flag first, fall back for older/newer Chrome.
  "$BROWSER" --headless=new --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$out" "$html" >/dev/null 2>&1 \
  || "$BROWSER" --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$out" "$html" >/dev/null 2>&1 \
  || { rm -f "$html"; echo "error: render failed for $in" >&2; return 1; }
  rm -f "$html"

  [[ -f "$out" ]] || { echo "error: no PDF produced for $in" >&2; return 1; }

  local pages
  if command -v pdfinfo >/dev/null 2>&1; then
    pages="$(pdfinfo "$out" 2>/dev/null | awk '/^Pages:/ {print $2}')"
  else
    pages="$(python3 - "$out" <<'PY'
import re, sys
print(len(re.findall(rb"/Type\s*/Page[^s]", open(sys.argv[1], "rb").read())))
PY
)"
  fi
  echo "✅ $out  (${pages:-?} pages)"
  [[ "${pages:-0}" =~ ^[0-9]+$ && "${pages:-0}" -gt 2 ]] && \
    echo "⚠️  over 2 pages — tighten if this is a capped submission." >&2
  return 0
}

rc=0
for in in "${INPUTS[@]}"; do
  if [[ -n "$EXPLICIT_OUT" ]]; then
    render_one "$in" "$EXPLICIT_OUT" || rc=1
  else
    render_one "$in" "${in%.*}.pdf" || rc=1
  fi
done
exit $rc
