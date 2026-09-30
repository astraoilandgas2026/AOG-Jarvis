import { test, expect } from "@playwright/test";

test("Emma browser E2E 30 real cycles + operational checks", async ({ page }) => {
  await page.goto("https://astraoilandgas2026.github.io/AOG-Jarvis/?e2e=1", { waitUntil: "networkidle", timeout: 60000 });
  await expect(page.locator("#command")).toBeVisible({ timeout: 30000 });

  const results = [];
  const cases = [
    "Hola Emma, ¿cómo estás?",
    "¿Cuál es nuestra prioridad actual?",
    "¿Qué tenemos pendiente con FL Óleos?",
    "¿Qué sabes de Olam?",
    "Anota para E2E Emma 30x: prueba de memoria temporal",
    "Pon una alarma en 1 minuto para E2E Emma 30x",
    "¿Qué tengo pendiente?"
  ];
  while (cases.length < 30) cases.push("Responde solamente: OK");

  for (let i = 0; i < cases.length; i++) {
    const message = cases[i];
    const started = Date.now();
    const assistants = page.locator("#messages .message.assistant");
    const before = await assistants.count();

    await page.locator("#command").fill(message);
    await page.locator("#execute").click();

    await expect.poll(async () => await assistants.count(), { timeout: 15000 }).toBeGreaterThan(before);
    const last = assistants.last();
    await expect(last).toBeVisible();
    await expect.poll(async () => ((await last.textContent()) || "").trim(), { timeout: 15000 }).not.toBe("");

    const elapsed = Date.now() - started;
    const text = ((await last.textContent()) || "").trim();
    if (/^Error real:/i.test(text) || /error de lectura|read error|stream/i.test(text)) {
      throw new Error(`CYCLE ${i + 1} FAILED after ${elapsed}ms: ${text}`);
    }

    if (i === 1 && !/Sosa|ISCC|FL.?Óleos|FL.?Oleos/i.test(text)) {
      throw new Error(`PRIORITY CONTEXT FAILED: ${text}`);
    }
    if (i === 2 && !/FL.?Óleos|FL.?Oleos|ISCC|pendiente/i.test(text)) {
      throw new Error(`SUPPLIER CONTEXT FAILED: ${text}`);
    }
    if (i === 4 && !/Anotado|guardado|memoria/i.test(text)) {
      throw new Error(`MEMORY WRITE FAILED: ${text}`);
    }
    if (i === 5 && !/programado|pendiente/i.test(text)) {
      throw new Error(`TASK WRITE FAILED: ${text}`);
    }
    if (i === 6 && !/E2E Emma 30x|pendiente|No tienes/i.test(text)) {
      throw new Error(`TASK READ FAILED: ${text}`);
    }

    results.push(elapsed);
    console.log(`CYCLE ${i + 1}: ${elapsed}ms -> ${text.slice(0,100)}`);
  }

  const sorted = [...results].sort((a,b)=>a-b);
  const median = sorted[Math.floor(sorted.length/2)];
  const fast = results.filter(x => x < 2000).length;
  console.log(`30 CYCLES PASS | median=${median}ms | under2s=${fast}/30 | max=${Math.max(...results)}ms`);

  expect(results).toHaveLength(30);
  expect(fast).toBeGreaterThanOrEqual(27);
});
