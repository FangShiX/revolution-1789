# 1.0.0 verification record

Release date: 2026-10-16.

- Public narrative: 54 original chapters, 89 legal choices, 10 personal endings. Every chapter is reachable and every chapter has a route to an ending.
- Engine: 10 automated tests, including 1000 seeded complete playthroughs, guarded puzzle exits, replay validation, malformed metadata, forged paths and runtime save limits.
- Browser: all 54 chapters reached through real choice buttons; reload, rewind, confirmed restart, collection preservation, download/reimport and invalid import recovery verified.
- Responsive: screenshots at 1440×1000, 768×1024, 390×844 and 320×740; no horizontal overflow; artwork loaded.
- Accessibility: automated WCAG 2/2.1 A/AA checks in light and dark themes returned no violations. This is not a claim of exhaustive manual assistive-technology certification.
- Failure handling: unavailable localStorage and malformed saved paths do not prevent play.
- Local private-book import: file load and section 1→75 navigation verified; no upload request emitted.
- Public distribution: generated directory scanned after build; only HTML, CSS, JavaScript and credited CC0 artwork. No scans, original book translation, OCR, or SQLite database.
- Dependency audit: zero known npm vulnerabilities at release preparation.

## Content boundaries

Historical events are grounded in linked official museum/government sources. Individual characters, jobs, letters, choices and personal endings are fictional. Player actions do not claim to alter actual national events.

The private source-book corpus is not part of this public release. Its local editorial edition has 372 nodes, 698 branches and 21 endings. One newly connected entry is explicitly labelled a supplemental branch; one printed target is corrected with a separate note. Original extraction evidence remains separate and immutable. OCR text is not represented as a perfect manual transcription.

## Remaining limitations

Private campaigns must be reimported after page reload before their saved progress resumes. Saves are browser-local unless exported. There is no account synchronization or score accumulation. The artwork license is CC0; the original application and public scenario use MIT. Rights to private book material are not provided by this project.
