import { test, expect } from "@playwright/test";

test("Emma browser E2E 23 real cycles", async ({ page }) => {
  await page.goto("https://astraoilandgas2026.github.io/AOG-Jarvis/?e2e=1", { waitUntil: "networkidle", timeout: 60000 });
  await expect(page.locator("#command")).toBeVisible({ timeout: 30000 });

  const results = [];
  for (let i = 1; i <= 23; i++) {
    const message = i <= 2 ? "Hola Emma, ¿cómo estás?" : "Responde solamente: OK";
    const started = Date.now();
    await page.locator("#command").fill(message);
    await page.locator("#execute").click();

    const assistants = page.locator("#messages .message.assistant");
    const before = await assistants.count();

    await expect.poll(async () => await assistants.count(), { timeout: 10000 }).toBeGreaterThan(before);
    const elapsed = Date.now() - started;
    const last = assistants.last();
    await expect(last).toBeVisible();

    const text = (await last.textContent())?.trim() || "";
    if (!text || /^Error real:/i.test(text) || /error de lectura|read error|stream/i.test(text)) {
      throw new Error(`CYCLE ${i} FAILED after ${elapsed}ms: ${text}`);
    }
    results.push(elapsed);
    console.log(`CYCLE ${i}: ${elapsed}ms -> ${text.slice(0,80)}`);
  }

  const sorted = [...results].sort((a,b)=>a-b);
  const median = sorted[Math.floor(sorted.length/2)];
  const fast = results.filter(x => x < 2000).length;
  console.log(`23 CYCLES PASS | median=${median}ms | under2s=${fast}/23 | max=${Math.max(...results)}ms`);

  expect(results).toHaveLength(23);
  expect(fast).toBeGreaterThanOrEqual(20);
});
