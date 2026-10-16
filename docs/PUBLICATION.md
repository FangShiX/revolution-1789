# Publication boundaries

The public release contains the engine and an original Chinese historical campaign. It does not contain the book's translated prose, scanned pages, OCR corpus, or book database. The original local project and extraction artifacts remain outside this Git repository.

Local book mode loads a JSON file selected by the player in the browser. It is never uploaded. Imported text is rendered as plain React text, not HTML. This workflow does not confer any rights to redistribute a book adaptation.

Do not copy private data into public/; Vite copies every file in that directory into the published build, even if it is ignored by Git. The release check inspects the actual distribution, not only .gitignore.

Original application code and original scenario text: MIT. Museum image: CC0, as declared by Paris Musées in the IIIF manifest https://apicollections.parismusees.paris.fr/iiif/320025946/manifest . Work: Serment du Jeu de paume, le 20 juin 1789; Jacques-Louis David; Musée Carnavalet, inventory P67. The image license is independent of the software license.

There is no analytics, remote save endpoint, or account system. Progress is stored in localStorage. Imported private campaigns are kept in memory; retain the source JSON and reimport it to continue a saved book game after reload.
