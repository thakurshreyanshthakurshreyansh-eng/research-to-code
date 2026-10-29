// Browser-level regression checks for the real single-page app. No secrets or paid APIs required.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

function makePdf(text) {
  const escaped = text.replace(/[\\()]/g, ch => "\\" + ch);
  const stream = "BT /F1 12 Tf 72 720 Td (" + escaped + ") Tj ET\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " + Buffer.byteLength(stream, "ascii") + " >>\nstream\n" + stream + "endstream"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += (i + 1) + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const xref = Buffer.byteLength(pdf, "ascii");
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) pdf += String(offset).padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
  return Buffer.from(pdf, "ascii");
}

async function downloadBytes(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    for (const viewport of [
      { width: 360, height: 800, name: "small-mobile" },
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
      const homeLayout = await page.evaluate(() => ({
        viewport: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll("body *")].map(el => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName, id: el.id || "", className: String(el.className || "").slice(0, 80), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
        }).filter(el => el.width > 0 && (el.right > window.innerWidth + 2 || el.left < -2)).sort((a,b) => b.right - a.right).slice(0, 12)
      }));
      assert.ok(homeLayout.scrollWidth <= homeLayout.viewport + 2, viewport.name + ": home view should not overflow horizontally: " + JSON.stringify(homeLayout));

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
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), viewport.name + ": compare view should not overflow horizontally");
      const diffState = await page.evaluate(() => ({ before: document.querySelector("#before").value, after: document.querySelector("#after").value, added: document.querySelector("#nAdd").textContent, removed: document.querySelector("#nDel").textContent, modified: document.querySelector("#nMod").textContent, output: document.querySelector("#cmpBox").textContent, children: document.querySelector("#cmpBox").children.length }));
      assert.ok(Number(diffState.added) + Number(diffState.removed) + Number(diffState.modified) > 0 && diffState.children > 0, viewport.name + ": diff output should not be empty: " + JSON.stringify(diffState));
      await page.locator('#nav button[data-t="code"]').click();
      await page.locator("#ex").click();
      assert.ok((await page.locator("#after").inputValue()).length > 0, viewport.name + ": example pair should load");
      await page.locator("#cmp").click();
      await page.locator("#resBody").waitFor({ state: "visible" });

      // Exercise the real browser Python/pytest worker once per run, not just its UI.
      if (viewport.name === "mobile") {
        await page.locator('#nav button[data-t="proof"]').click();
        await page.locator("#run").click();
        await page.waitForFunction(() => {
          const text = document.querySelector("#runs")?.innerText || "";
          return text.includes("Passed") || text.includes("Did not run") || text.includes("Failed");
        }, { timeout: 120000 });
        const runReport = await page.locator("#runs").innerText();
        assert.match(runReport, /Passed/i, "browser Python/pytest should execute and pass the supplied example tests; report: " + runReport.slice(0, 1800));
        assert.match(runReport, /5 passed/i, "browser pytest should report five executed passing tests; report: " + runReport.slice(0, 1800));
        console.log("PASS mobile: real browser Pyodide/pytest execution, five sample tests passed");
      }

      await page.locator('#nav button[data-t="code"]').click();

      // Export is a real browser download, not just a click handler.
      const downloadPromise = page.waitForEvent("download");
      await page.locator("#exportWorkspace").click();
      const download = await downloadPromise;
      assert.equal(download.suggestedFilename(), "research-to-code-workspace.json", viewport.name + ": workspace export filename");

      // Import must validate and restore a well-formed workspace backup.
      const backup = {
        format: "research-to-code-workspace", version: 1, exportedAt: new Date().toISOString(),
        pdfText: "", before: "def saved():\\n    return 7\\n", after: "def saved():\\n    return 8\\n",
        tests: "def test_saved():\\n    assert True\\n", aiOutput: "", runs: []
      };
      await page.locator("#importWorkspace").setInputFiles({
        name: "roundtrip.json", mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(backup))
      });
      await page.waitForFunction(() => document.querySelector("#workspaceMsg").textContent.includes("Workspace imported"));
      assert.equal(await page.locator("#before").inputValue(), backup.before, viewport.name + ": workspace import restores Before code");
      assert.equal(await page.locator("#after").inputValue(), backup.after, viewport.name + ": workspace import restores After code");
      assert.equal(await page.locator("#tests").inputValue(), backup.tests, viewport.name + ": workspace import restores tests");

      // A small real PDF must extract text in the browser, not just reject bad files.
      await page.locator('#nav button[data-t="paper"]').click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), viewport.name + ": PDF view should not overflow horizontally");
      const samplePdfText = "Research to Code sample paper describes a method. Algorithm 1 and Equation 1 are included for extraction testing.";
      await page.locator("#pdf").setInputFiles({
        name: "sample.pdf",
        mimeType: "application/pdf",
        buffer: makePdf(samplePdfText)
      });
      await page.waitForFunction(() => !document.querySelector("#pdfOut").hidden, { timeout: 45000 });
      assert.ok((await page.locator("#prev").textContent()).includes("Research to Code sample paper"), viewport.name + ": PDF text should be extracted");
      console.log("PASS " + viewport.name + ": valid PDF text extraction");
      // Proof Lab: exercise each module in a real browser with AI disabled.
      // The local reports must stay honest about what was and was not executed.
      if (viewport.name === "mobile") {
        await page.locator('#nav button[data-t="code"]').click();
        await page.locator("#before").fill("import os\\ndef f(): return os.name");
        await page.locator("#after").fill("import json\\ndef f(): return json.dumps(1)");
        await page.locator('#nav button[data-t="proof"]').click();
        await page.locator("#tests").fill("def test_f(): assert True");
        await page.evaluate(() => {
          window.runs.push({
            at: new Date().toISOString(), target: "after",
            code: document.querySelector("#after").value,
            tests: document.querySelector("#tests").value,
            ran: true, status: "failed", exit: 1, ms: 5,
            out: "AssertionError: assert 0 == 1", err: "", message: ""
          });
        });
        await page.locator('#nav button[data-t="lab"]').click();
        assert.ok(await page.locator("#labFix").isEnabled(), "offline Fix diagnosis should remain available when AI is disabled");
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), "Proof Lab should not overflow horizontally");

        const proofDownloadPromise = page.waitForEvent("download");
        await page.locator("#labProofPack").click();
        const proofDownload = await proofDownloadPromise;
        assert.equal(proofDownload.suggestedFilename(), "research-to-code-proof-pack.json");
        const proof = JSON.parse((await downloadBytes(proofDownload)).toString("utf8"));
        assert.equal(proof.format, "research-to-code-proof-pack");
        assert.equal(proof.verificationRules.aiOutputIsExecutionEvidence, false);
        assert.equal(proof.evidence.latestRun.status, "failed");

        await page.locator("#labClaims").click();
        await page.waitForFunction(() => (document.querySelector("#labOutput")?.textContent || "").includes("local-only"));
        const claims = JSON.parse(await page.locator("#labOutput").textContent());
        assert.equal(claims.mode, "local-only");
        assert.equal(claims.paper.extractedTextAvailable, true);
        assert.match(claims.verdict, /No scientific claim is marked verified/);

        await page.locator("#labCompat").click();
        await page.waitForFunction(() => (document.querySelector("#labOutput")?.textContent || "").includes("local-only"));
        const compat = JSON.parse(await page.locator("#labOutput").textContent());
        assert.ok(compat.imports.onlyBefore.includes("os"));
        assert.ok(compat.imports.onlyAfter.includes("json"));

        await page.locator("#labFix").click();
        await page.waitForFunction(() => (document.querySelector("#labOutput")?.textContent || "").includes("local failure diagnosis"));
        const diagnosis = JSON.parse(await page.locator("#labOutput").textContent());
        assert.ok(diagnosis.diagnosis.hints.some(h => h.includes("Assertion failed")));
        assert.equal(diagnosis.diagnosis.codeMatchesCurrent, true);
        assert.equal(diagnosis.diagnosis.testsMatchCurrent, true);
        assert.equal(await page.locator("#after").inputValue(), "import json\\ndef f(): return json.dumps(1)", "local diagnosis must not silently change code");

        const zipDownloadPromise = page.waitForEvent("download");
        await page.locator("#labHandoff").click();
        const zipDownload = await zipDownloadPromise;
        assert.equal(zipDownload.suggestedFilename(), "research-to-code-project-handoff.zip");
        const zip = await downloadBytes(zipDownload);
        assert.equal(zip.readUInt32LE(0), 0x04034b50, "handoff must be a real ZIP archive");
        assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50, "handoff must have an end-of-central-directory record");
        console.log("PASS mobile: Proof Pack, claims audit, compatibility report, offline Fix diagnosis and real ZIP handoff");
      }


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

      // Confirm the offline shell is actually controlled and can reopen without a network.
      if (viewport.name === "mobile") {
        const serviceWorkerReady = await page.evaluate(async () => {
          if (!("serviceWorker" in navigator)) return false;
          const registration = await navigator.serviceWorker.ready;
          return !!registration.active;
        });
        assert.ok(serviceWorkerReady, "mobile: service worker should install and activate");
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => !!navigator.serviceWorker.controller);
        await context.setOffline(true);
        const offlineResponse = await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
        assert.equal(offlineResponse.status(), 200, "mobile: offline app shell should reopen");
        assert.match(await page.title(), /Research to Code/, "mobile: offline shell should render the app");
        await context.setOffline(false);
        console.log("PASS mobile: service worker offline app shell");
      }

      if (failures.length) throw new Error(failures.join("\n"));
      console.log("PASS " + viewport.name + ": entry gate, theme, language, navigation, diff, example, export, invalid PDF validation, draft status");
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
