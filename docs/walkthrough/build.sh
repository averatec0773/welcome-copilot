#!/usr/bin/env bash
# Renders walkthrough.html to walkthrough.pdf with headless Chrome.
# Re-run after updating any screenshot in shots/ or the HTML itself.
set -euo pipefail
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=15000 \
  --print-to-pdf="walkthrough.pdf" \
  "file://$(pwd)/walkthrough.html"
ls -lh walkthrough.pdf
