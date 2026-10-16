# Revolution 1789 · 革命之间

A Chinese branching historical narrative about personal choices during the French Revolution, 1789–1799. No score grinding: decisions determine the path. Original public campaign, historical notes, ending collection, local saves, and private local book import.

[在线试玩](https://fangshix.github.io/revolution-1789/) · [v1.0.0](https://github.com/FangShiX/revolution-1789/releases/tag/v1.0.0)

公开版含 54 个原创节点、89 条分支和 10 种个人结局。原书模式的文字不在公开仓库中分发。

## Play locally

Requires Node.js 22.12+ or 24 LTS.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Windows PowerShell users can use `npm.cmd`.

## Verify and build

```sh
npm test
npm run build
npm run release:check
npm run preview
```

For browser verification, start the app, set `CHROME_PATH` to a Chrome/Chromium executable when it is not detected automatically, and run `npm run test:e2e`. Optional `TEST_URL` overrides the loopback URL. The suite traverses every original chapter using real choice buttons, checks light/dark accessibility, responsive overflow, artwork rendering, persistent saves and storage-denied play. Reports/screenshots are local in `test-results/`.

## 游戏

直接进入故事，选择影响个人经历。回退会截断当前路线，重开保留结局与留存档案。存档默认保存在当前浏览器，可导出 JSON 备份。历史注解与虚构叙事分别呈现，结局代表个人命运，不是对真实历史的改写。

## Local book mode

Open 档案与存档 → 载入本地剧本 and select a compatible JSON. Files stay on your computer; no upload endpoint exists. Reimport your private campaign after reload, then its saved progress resumes. Different campaign IDs have separate save slots. Never import untrusted files solely because they use the `.json` extension; the engine validates their structure and navigation and renders prose as plain text.

The repository deliberately excludes the source book, OCR, scans, translations and private database. They are not licensed by this project. See [publication boundaries](docs/PUBLICATION.md). The local original-book audit is maintained outside this repository and is not advertised as fully manually proofread.

## Architecture

- `src/data/publicCampaign.js`: original public storyline and official historical sources.
- `src/engine.js`: validated campaigns, legal transitions, save replay, rewind and graph audit.
- `src/main.jsx`: accessible reading interface and browser-only saves/imports.
- `tests/`: campaign and state regression tests.
- `scripts/`: browser verification and public distribution checks.

The static build uses relative asset URLs and can be hosted at a domain root or a project subpath. Vite development and preview servers bind to loopback by default; use a static host for publication.

## License

Code and original scenario: [MIT](LICENSE). Artwork is CC0 Paris Musées / Musée Carnavalet, independently credited in the application and publication notes. Historical website text is not reproduced wholesale; linked sources support short original contextual notes.
