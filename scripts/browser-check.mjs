import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { AxeBuilder } from "@axe-core/playwright";
import { campaign } from "../src/data/publicCampaign.js";

const url = process.env.TEST_URL || "http://127.0.0.1:5173";
const executablePath =
  process.env.CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find(existsSync);
const browser = await chromium.launch({ executablePath, headless: true });
const results = { errors: [], viewports: [], chapters: 0, checks: [] };
await mkdir("test-results", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => results.errors.push(e.message));
  await page.goto(url);
  await page.locator("#story h1").waitFor();
  const title = await page.locator("#story h1").textContent();
  const paths = new Map([[campaign.rules.start_section, []]]),
    todo = [campaign.rules.start_section];
  while (todo.length) {
    const id = todo.shift(),
      node = campaign.sections.find((n) => n.id === id);
    if (node.terminal_type) continue;
    for (const ch of node.choices)
      if (!paths.has(ch.target)) {
        paths.set(ch.target, [...paths.get(id), ch.id]);
        todo.push(ch.target);
      }
  }
  for (const node of campaign.sections) {
    await page.reload();
    await page.locator("#story").waitFor();
    await page.evaluate(() => {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key.startsWith("revolution-1789-v1:")) localStorage.removeItem(key);
      }
    });
    await page.reload();
    await page.locator("#story h1").waitFor();
    for (const id of paths.get(node.id)) {
      const from = campaign.sections.find((n) =>
        n.choices.some((c) => c.id === id),
      );
      const ch = from.choices.find((c) => c.id === id);
      await page
        .getByRole("button", {
          name: new RegExp(ch.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        })
        .click();
    }
    assert.equal(await page.locator("#story h1").textContent(), node.title);
    results.chapters++;
  }
  results.checks.push(
    "Every public node reached through visible legal choice buttons",
  );
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#story h1").waitFor();
  const first = campaign.sections[0].choices[0];
  await page.locator(".choice").first().click();
  const secondTitle = await page.locator("#story h1").textContent();
  await page.reload();
  assert.equal(await page.locator("#story h1").textContent(), secondTitle);
  await page.getByRole("button", { name: "回退一步", exact: true }).click();
  assert.equal(await page.locator("#story h1").textContent(), title);
  await page.getByRole("button", { name: "留存", exact: true }).click();
  await page.getByRole("button", { name: "重新开始", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "重新开始", exact: true })
    .click();
  await page.getByRole("button", { name: "档案与存档", exact: true }).click();
  assert(
    await page.getByRole("dialog").getByText(title, { exact: true }).count(),
  );
  await page.keyboard.press("Escape");
  results.checks.push(
    "Reload, back, bookmark preservation and restart confirmation",
  );
  for (const [width, height] of [
    [1440, 1000],
    [768, 1024],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({
      path: `test-results/${width}.png`,
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false, `Horizontal overflow at ${width}`);
    assert(
      await page
        .locator("img")
        .evaluate((i) => i.complete && i.naturalWidth > 0),
    );
    results.viewports.push({ width, height, overflow });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  results.accessibility = axe.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
  }));
  assert.deepEqual(results.accessibility, []);
  await page.getByRole("button", { name: "切换深色", exact: true }).click();
  await page.screenshot({ path: "test-results/dark.png", fullPage: true });
  const darkAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    darkAxe.violations.map((v) => v.id),
    [],
  );
  results.checks.push("Light/dark WCAG automated checks");
  const denied = await browser.newPage();
  await denied.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Denied", "QuotaExceededError");
    };
  });
  await denied.goto(url);
  await denied.locator("#story h1").waitFor();
  await denied.locator(".choice").first().click();
  await denied.locator("#story h1").waitFor();
  assert.equal(await denied.locator("#story h1").textContent(), secondTitle);
  await denied.close();
  results.checks.push("Memory-only play when persistent storage denied");
  const forged = await browser.newPage();
  await forged.addInitScript(
    ({ id }) =>
      localStorage.setItem(
        `revolution-1789-v1:${id}`,
        JSON.stringify({
          version: 1,
          campaignId: id,
          path: [{}],
          decisions: [],
        }),
      ),
    { id: campaign.id },
  );
  await forged.goto(url);
  await forged.locator("#story h1").waitFor();
  assert.equal(await forged.locator("#story h1").textContent(), title);
  await forged.close();
  results.checks.push("Malformed saved paths recovered safely");
  await page.getByRole("button", { name: "档案与存档", exact: true }).click();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出存档", exact: true }).click();
  const exportFile = await (await exported).path();
  await page.getByRole("button", { name: "导入存档", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles(exportFile);
  await page.getByRole("status").filter({ hasText: "存档已恢复" }).waitFor();
  await page.getByRole("button", { name: "档案与存档", exact: true }).click();
  await page.getByRole("button", { name: "导入存档", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from("{broken"),
    });
  await page.getByRole("status").filter({ hasText: "导入失败" }).waitFor();
  await page.keyboard.press("Escape");
  results.checks.push(
    "Actual save download/reimport and malformed file recovery",
  );
  if (process.env.BOOK_JSON) {
    const requests = [];
    page.on("request", (r) => {
      if (r.method() !== "GET") requests.push(r.method() + " " + r.url());
    });
    await page.getByRole("button", { name: "档案与存档", exact: true }).click();
    await page
      .getByRole("button", { name: "载入本地剧本", exact: true })
      .click();
    await page.locator("input[type=file]").setInputFiles(process.env.BOOK_JSON);
    await page
      .getByRole("status")
      .filter({ hasText: "本地剧本已载入" })
      .waitFor();
    assert.equal(await page.locator("#story h1").textContent(), "第1节");
    await page.locator(".choice").first().click();
    assert.equal(await page.locator("#story h1").textContent(), "第75节");
    assert.deepEqual(requests, []);
    results.checks.push(
      "Private book import, 1→75 navigation and no upload requests",
    );
  }
  assert.deepEqual(results.errors, []);
} finally {
  await writeFile(
    "test-results/browser-report.json",
    JSON.stringify(results, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
