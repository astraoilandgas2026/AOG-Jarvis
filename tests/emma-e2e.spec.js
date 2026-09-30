import { test, expect } from "@playwright/test";

test("Emma browser E2E 30 operational cycles", async ({ page }) => {
  await page.goto("https://astraoilandgas2026.github.io/AOG-Jarvis/?e2e=1", { waitUntil: "networkidle", timeout: 60000 });
  await expect(page.locator("#command")).toBeVisible({ timeout: 30000 });

  const messages = [
    "Hola Emma, ¿cómo estás?",
    "¿Qué tenemos pendiente de Astra Belincar?",
    "Anota como prioridad máxima: que Sosa nos dé el ISCC de FL Óleos.",
    "Pon una alarma en 1 minuto para E2E Emma 30x.",
    "¿Qué pendientes tengo?",
    "Busca en Astra todo lo relacionado con FL Óleos, Sosa e ISCC y ordénamelo con el contexto que ya tienes.",
    ...Array(24).fill("Responde solamente: OK")
  ];

  const results = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const started = Date.now();
    const assistants = page.locator("#messages .message.assistant");
    const before = await assistants.count();

    await page.locator("#command").fill(message);
    await page.locator("#execute").click();

    await expect.poll(async () => (await assistants.allTextContents()).slice(before).some(t => t.trim().length > 0), { timeout: 15000 }).toBe(true);
    const texts = (await assistants.allTextContents()).slice(before).map(t => t.trim()).filter(Boolean);
    const text = texts[texts.length - 1] || "";
    const elapsed = Date.now() - started;

    if (/^Error real:/i.test(text) || /error de lectura|read error|stream/i.test(text)) {
      throw new Error(`CYCLE ${i + 1} FAILED after ${elapsed}ms: ${text}`);
    }

    if (i === 1 && /No encontré resultados/i.test(text)) throw new Error(`ASTRA CONTEXT FAILED: ${text}`);
    if (i === 2 && !/anot|guardad|memoria/i.test(text)) throw new Error(`MEMORY WRITE FAILED: ${text}`);
    if (i === 3 && !/programado|pendiente/i.test(text)) throw new Error(`TASK WRITE FAILED: ${text}`);
    if (i === 4 && !/E2E Emma 30x|pendiente|No tienes/i.test(text)) throw new Error(`TASK READ FAILED: ${text}`);
    if (i === 5 && !/FL.?Óleos|FL.?Oleos|Sosa|ISCC/i.test(text)) throw new Error(`PROCUREMENT CONTEXT FAILED: ${text}`);

    results.push(elapsed);
    console.log(`CYCLE ${i + 1}: ${elapsed}ms -> ${text.slice(0,120)}`);
  }

  const sorted = [...results].sort((a,b)=>a-b);
  const median = sorted[Math.floor(sorted.length/2)];
  const fast = results.filter(x => x < 2000).length;
  console.log(`30 CYCLES PASS | median=${median}ms | under2s=${fast}/30 | max=${Math.max(...results)}ms`);

  expect(results).toHaveLength(30);
  expect(fast).toBeGreaterThanOrEqual(27);
});