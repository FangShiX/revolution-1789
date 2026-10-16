# 1.0 release criteria

## Public application

- Original campaign has no unreachable node, invalid choice target, or closed non-ending component.
- Every chapter is reached through real UI choices during browser tests; each explicit choice is covered by engine tests.
- Save imports replay every decision and reject impossible transitions, bad IDs, mismatched campaigns, and malformed arrays.
- Storage denial preserves memory-only play; reload persistence works when storage is available.
- Restart requires confirmation and preserves ending/bookmark collections.
- Keyboard focus moves to the new chapter; dialogs trap focus, close with Escape, and restore focus.
- 320, 390, 768 and 1440 px viewports have no horizontal overflow; bundled artwork loads.
- Automated WCAG A/AA checks pass in light/dark modes. Automated checks do not replace all assistive-technology testing.
- Production build and distribution content scan pass. No private book text, scans, OCR or SQLite files are distributed.
- npm audit has no known vulnerabilities at release time.
- GitHub source, tag and versioned release asset correspond to the tested commit.

## Local source-book archive

The original 372 sections remain private and are audited separately. Preserve provenance of corrected links; implicit puzzle solutions are identified as inferred routes. Suppress score accumulation, as requested. Keep surviving original-book uncertainties explicit, including any printed routing errors. This archival corpus must not be described as wholly manually proofread unless every page has been reviewed.
