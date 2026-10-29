// Browser-level regression checks for the real single-page app. No secrets or paid APIs required.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    for (const viewport of [
      { width: 390, height: 844, name: "mobile" },
      { width: 1280, height: 900, name: "desktop" }
    ]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, acceptDownloads: true });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      page.on("pageerror", error => failures.push(viewport.name + " pageerror: " + error.message));
      const response = await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
      assert.equal(response.status(), 200, viewport.name + ": app should return HTTP 200");
      await page.locator("#gateDemo").waitFor({ state: "visible" });
      await page.locator("#gateDemo").click();
      await page.locator("#gateScreen").waitFor({ state: "hidden" });
      await page.locator("#previewModeBanner").waitFor({ state: "visible" });

      // Theme and language controls must update the page without a reload.
      const themeBefore = await page.locator("html").getAttribute("data-theme");
      await page.locator("#themeToggle").click();
      const themeAfter = await page.locator("html").getAttribute("data-theme");
      assert.notEqual(themeAfter, themeBefore, viewport.name + ": theme toggle should change theme");
      await page.locator("#languageToggle").selectOption("en");
      assert.equal(await page.locator("html").getAttribute("lang"), "en", viewport.name + ": language toggle should switch language");

      // Navigation, example loading, and compare view.
      await page.locator('#nav button[data-t="code"]').click();
      await page.locator("#before").fill("def add(a, b):\n    return a - b\n");
      await page.locator("#after").fill("def add(a, b):\n    return a + b\n");
      await page.locator("#cmp").click();
      await page.locator("#resBody").waitFor({ state: "visible" });
      const diffState = await page.evaluate(() => ({ before: document.querySelector("#before").value, after: document.querySelector("#after").value, added: document.querySelector("#nAdd").textContent, removed: document.querySelector("#nDel").textContent, modified: document.querySelector("#nMod").textContent, output: document.querySelector("#cmpBox").textContent, children: document.querySelector("#cmpBox").children.length }));
      assert.ok(Number(diffState.added) + Number(diffState.removed) + Number(diffState.modified) > 0 && diffState.children > 0, viewport.name + ": diff output should not be empty: " + JSON.stringify(diffState));
      await page.locator('#nav button[data-t="code"]').click();
      await page.locator("#ex").click();
      assert.ok((await page.locator("#after").inputValue()).length > 0, viewport.name + ": example pair should load");
      await page.locator("#cmp").click();
      await page.locator("#resBody").waitFor({ state: "visible" });

      // Export is a real browser download, not just a click handler.
      const downloadPromise = page.waitForEvent("download");
      await page.locator("#exportWorkspace").click();
      const download = await downloadPromise;
      assert.equal(download.suggestedFilename(), "research-to-code-workspace.json", viewport.name + ": workspace export filename");

      // Invalid PDF must fail clearly before loading external libraries.
      await page.locator('#nav button[data-t="paper"]').click();
      await page.locator("#pdf").setInputFiles({
        name: "invalid.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("this is not a PDF")
      });
      await page.locator("#pdfMsg").waitFor({ state: "visible" });
      await page.waitForFunction(() => document.querySelector("#pdfMsg").textContent.toLowerCase().includes("not a valid pdf"));
      assert.equal(await page.locator("#pdfOut").isVisible(), false, viewport.name + ": invalid PDF must not show extracted output");

      // Draft persistence and the launch checklist should remain usable.
      await page.locator('#nav button[data-t="code"]').click();
      await page.locator("#before").fill("draft persistence check");
      await page.waitForFunction(() => document.querySelector("#saveBadge").textContent.length > 0);
      assert.ok(await page.locator("#saveBadge").innerText(), viewport.name + ": save status should be shown");

      if (failures.length) throw new Error(failures.join("\n"));
      console.log("PASS " + viewport.name + ": entry gate, theme, language, navigation, diff, example, export, invalid PDF validation, draft status");
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
