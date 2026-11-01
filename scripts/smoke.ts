/**
 * npm run smoke   (after npm run build)
 *
 * A browser smoke test (Constitution Art. 9.2, roadmap R3). It serves the built site, opens it in a real
 * headless Chrome and checks what a visitor would meet: every instrument opens from a cold link, draws, and
 * runs; the home, course, About and Instruments pages and the search box work; a phone-sized screen does not
 * overflow. It exists because the demo is redeployed on every push and a sandbox can break in a way no
 * Node test sees (a bad chunk, a renderer that throws, a blank canvas).
 *
 * CPU only: Chrome is started with its GPU disabled and a software WebGL, so it never touches a graphics card.
 * It needs Chrome, Chromium or Edge: set CHROME_PATH, or it looks in the usual places (GitHub's Ubuntu runners
 * have Chrome installed).
 *
 * Run it on a build made without a local/ folder; private modules would change the counts it expects. If the
 * build was made with VITE_BASE (as the Pages deploy does), set the same value here.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import type { Browser, Page } from 'puppeteer-core';
import { SIMULATION_CATALOG } from '../src/simulations';
import { COURSES } from '../src/courses/courses';

const root = resolve(import.meta.dirname ?? '.', '..');
const PORT = Number(process.env.SMOKE_PORT ?? 4179);
// Serve the build the way it will be deployed: with VITE_BASE=/agentuto/ it is checked under that sub-path.
const BASE_PATH = (process.env.VITE_BASE ?? '/').replace(/\/$/, '');
const BASE = `http://localhost:${PORT}${BASE_PATH}`;
const only = process.env.SMOKE_ONLY?.split(',').filter(Boolean);
/**
 * A drawn canvas compresses to far more than an empty one. Measured: an empty apparatus canvas is ~2.3 kB as a
 * PNG, the simplest real scene (the shipped example: a ball and a line) is ~5.8 kB, and the thinnest built-in one
 * (Lorentz, 3D) ~14 kB, so the line sits between the empty canvas and the simplest scene.
 */
const MIN_CANVAS_PNG_BYTES = 3500;
const OUT = join(root, 'test-results', 'smoke');

const failures: string[] = [];
let checks = 0;

function pass(label: string, detail = ''): void {
  checks++;
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
}
function fail(label: string, reason: string): void {
  checks++;
  failures.push(`${label}: ${reason}`);
  console.log(`  ✗ ${label}: ${reason}`);
}

function findChrome(): string | null {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find((p) => p && existsSync(p)) ?? null;
}

async function startServer(): Promise<{ stop: () => void }> {
  if (!existsSync(join(root, 'dist', 'index.html'))) {
    throw new Error('dist/ not found: run `npm run build` first.');
  }
  const child = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${BASE}/`)).ok) return { stop: () => child.kill() };
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill();
  throw new Error(`the preview server did not answer on ${BASE}`);
}

/** Collects everything that should never happen while a page is used. */
function watch(page: Page, into: string[]): void {
  page.on('pageerror', (error) => into.push(`script error: ${String(error).split('\n')[0]}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon/i.test(text)) return;
    into.push(`console error: ${text.slice(0, 160)}`);
  });
  page.on('requestfailed', (request) => into.push(`request failed: ${request.url().replace(BASE, '')}`));
  page.on('response', (response) => {
    if (response.status() >= 400) into.push(`HTTP ${response.status()}: ${response.url().replace(BASE, '')}`);
  });
}

async function snapshotOnFailure(page: Page, name: string): Promise<void> {
  try {
    mkdirSync(OUT, { recursive: true });
    const file = join(OUT, `${name.replace(/[^a-z0-9-]+/gi, '_')}.png`);
    writeFileSync(file, await page.screenshot({ type: 'png' }));
    console.log(`    (screenshot: ${file})`);
  } catch {
    /* the page may already be gone */
  }
}

const simTime = (page: Page) =>
  page.evaluate(() => {
    // The readout is "t = <span>1.71</span>s": find the span whose parent reads exactly that.
    const span = [...document.querySelectorAll('main span')].find((s) => /^t = [0-9.]+s$/.test((s.parentElement?.textContent ?? '').trim()));
    const value = parseFloat(span?.textContent ?? '');
    return Number.isFinite(value) ? value : null;
  });

async function checkSandbox(browser: Browser, id: string, webgl: boolean): Promise<void> {
  const sim = SIMULATION_CATALOG[id];
  const problems: string[] = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  watch(page, problems);
  try {
    await page.goto(`${BASE}/#/sandbox/${id}`, { waitUntil: 'load' });
    try {
      await page.waitForSelector('main h1', { timeout: 20000 });
    } catch {
      problems.push('the sandbox screen never appeared');
    }
    const title = await page.evaluate(() => document.querySelector('main h1')?.textContent ?? '');
    if (title && title !== sim.title) problems.push(`the heading says "${title}", expected "${sim.title}"`);
    // Feedback from inside the instrument opens a bug report already titled with the instrument's id.
    const feedback = await page.$eval('a[data-community="feedback"]', (el) => (el as HTMLAnchorElement).href).catch(() => '');
    const wantFeedback = `https://github.com/danielw-sudo/agentuto/issues/new?template=bug_report.md&title=${encodeURIComponent(`[${id}] `)}`;
    if (feedback !== wantFeedback) problems.push(`the Feedback link is "${feedback}", expected "${wantFeedback}"`);
    const tabTitle = await page.title();
    if (tabTitle !== `${sim.title} · Agentuto`) problems.push(`the browser tab says "${tabTitle}", expected "${sim.title} · Agentuto"`);

    let detail = '';
    if (sim.mode === '3D' && !webgl) {
      // The designed behaviour on a machine without WebGL: an explanation, not an empty box.
      const explained = await page.evaluate(() => /WebGL/.test(document.querySelector('main')?.textContent ?? ''));
      if (!explained) problems.push('no WebGL here, and the screen does not explain it');
      detail = 'needs WebGL; the explanation is shown';
    } else {
      try {
        await page.waitForSelector('section[aria-label="Apparatus"] canvas', { timeout: 20000 });
      } catch {
        problems.push('no drawing surface appeared');
      }
      const canvas = await page.$('section[aria-label="Apparatus"] canvas');
      if (canvas) {
        const box = await canvas.boundingBox();
        if (!box || box.width < 200 || box.height < 150) problems.push(`the drawing surface is only ${Math.round(box?.width ?? 0)}x${Math.round(box?.height ?? 0)}`);
        const before = await simTime(page);
        await new Promise((r) => setTimeout(r, 1500));
        const after = await simTime(page);
        if (before === null || after === null) problems.push('the transport clock is not on screen');
        else if (after - before < 0.2) problems.push(`the simulation is not running (t went ${before} → ${after} in 1.5 s)`);
        const bytes = (await canvas.screenshot({ type: 'png' })).length;
        if (bytes < MIN_CANVAS_PNG_BYTES) problems.push(`the drawing looks blank (${bytes} bytes as an image)`);
        detail = `${sim.mode}, t ${before} → ${after}, drawing ${bytes} bytes`;
      }
    }
    if (problems.length > 0) {
      fail(`sandbox ${id}`, [...new Set(problems)].slice(0, 4).join('; '));
      await snapshotOnFailure(page, `sandbox-${id}`);
    } else {
      pass(`sandbox ${id}`, detail);
    }
  } finally {
    await page.close();
  }
}

async function checkSite(browser: Browser): Promise<void> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const problems: string[] = [];
  watch(page, problems);
  const bad = async (label: string, reason: string) => {
    fail(label, reason);
    await snapshotOnFailure(page, label);
  };
  const upstream = Object.keys(SIMULATION_CATALOG).length;

  // Home: a list of courses
  await page.goto(`${BASE}/#/`, { waitUntil: 'load' });
  await page.waitForSelector('#courses a', { timeout: 20000 }).catch(() => undefined);
  const cards = await page.$$eval('#courses a', (links) => links.map((a) => a.getAttribute('href')));
  if (cards.length < COURSES.length) await bad('home page', `${cards.length} course cards, expected at least ${COURSES.length}`);
  else pass('home page', `${cards.length} course cards`);

  // The activity card stays away until there is an entry, then shows the learner's own streak
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 20000 }).catch(() => undefined); // the card is a lazy chunk
  if (await page.$('section[aria-label="Your inquiry log"]')) await bad('activity card', 'shown on a visit with no entries');
  else {
    const entry = {
      id: 'smoke-1', sandboxId: 'free-fall', createdAt: new Date().toISOString(), prediction: { text: 'p' }, parameters: { g: 9.81 },
      measurement: { channel: 'height', value: 1 }, explanation: '',
    };
    await page.evaluate((e) => localStorage.setItem('agentuto.inquiry-log.v1', JSON.stringify({ version: 1, entries: [e] })), entry);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('section[aria-label="Your inquiry log"] [role="img"]', { timeout: 20000 }).catch(() => undefined);
    const label = await page.$eval('section[aria-label="Your inquiry log"] [role="img"]', (el) => el.getAttribute('aria-label') ?? '').catch(() => 'no activity card appeared');
    if (label !== '1 entry on 1 day. Current streak 1, longest 1.') await bad('activity card', `read "${label}"`);
    else pass('activity card', 'absent when empty, streak shown after one entry');
    await page.evaluate(() => localStorage.removeItem('agentuto.inquiry-log.v1'));
  }

  // The theme toggle: an icon button at the top right. With the system set to dark, Light changes the page's own
  // colours, survives a reload, and Auto hands control back.
  {
    const paper = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--paper').trim());
    const choice = () => page.$eval('button[data-theme-toggle]', (b) => b.getAttribute('data-choice') ?? '').catch(() => 'no toggle');
    const choose = async (name: string) => {
      for (let i = 0; i < 4 && (await choice()) !== name; i += 1) await page.click('button[data-theme-toggle]');
    };
    const placement = await page.$eval('button[data-theme-toggle]', (b) => {
      const box = b.getBoundingClientRect();
      return { right: window.innerWidth - box.right, top: box.top };
    }).catch(() => null);
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    const start = await paper();
    await choose('light');
    const light = await paper();
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('button[data-theme-toggle]', { timeout: 20000 }).catch(() => undefined);
    const afterReload = await paper();
    const stillLight = await choice();
    await choose('auto');
    const auto = await paper();
    await choose('contrast');
    const contrastPaper = await paper();
    await page.goto(`${BASE}/#/sandbox/harmonic-oscillator`, { waitUntil: 'load' });
    await page.waitForSelector('main h1', { timeout: 20000 }).catch(() => undefined);
    const inInstrument = await page.evaluate(() => getComputedStyle(document.querySelector('main') as Element).getPropertyValue('--paper').trim());
    await page.evaluate(() => localStorage.removeItem('agentuto.theme.v1'));
    if (!placement || placement.top > 80 || placement.right > 120) await bad('theme toggle', 'not at the top right: ' + JSON.stringify(placement));
    else if (start !== '#0d1015' || light !== '#f7f6f2') await bad('theme toggle', `system dark gave ${start}, Light gave ${light}`);
    else if (afterReload !== '#f7f6f2' || stillLight !== 'light') await bad('theme toggle', `after a reload: ${afterReload}, choice "${stillLight}"`);
    else if (auto !== start) await bad('theme toggle', `Auto gave ${auto}, expected ${start}`);
    else if (!/^#000(000)?$/.test(contrastPaper) || !/^#000(000)?$/.test(inInstrument)) await bad('theme toggle', `high contrast gave ${contrastPaper} on the page and ${inInstrument} on an instrument screen, expected #000000 on both`);
    else pass('theme toggle', 'top-right icon; Light overrides a dark system, is remembered across a reload, Auto returns to the system choice, high contrast reaches the instrument screens too');
  }

  // Community links are on every page, point at the project, and open outside the app (this is a plain localhost server)
  {
    const wanted = ['https://github.com/danielw-sudo/agentuto/discussions', 'https://github.com/danielw-sudo/agentuto/issues/new/choose', 'https://github.com/danielw-sudo/agentuto/issues/new?template=new_instrument.md'];
    for (const route of ['#/', '#/about', '#/instruments', '#/guide']) {
      await page.goto(`${BASE}/${route}`, { waitUntil: 'load' });
      await page.waitForSelector('footer a', { timeout: 20000 }).catch(() => undefined);
      const links = await page.$$eval('footer a', (as) => as.map((a) => ({ href: (a as HTMLAnchorElement).href, target: a.getAttribute('target'), rel: a.getAttribute('rel') ?? '' })));
      const missing = wanted.filter((w) => !links.some((l) => l.href === w && l.target === '_blank' && /noreferrer/.test(l.rel)));
      if (missing.length > 0) await bad(`community links on ${route}`, 'missing in the footer: ' + missing.join(', '));
      else pass(`community links on ${route}`, 'discuss, report, propose');
    }
  }

  // Milestones: a log that changed one thing earns "Changed one thing" in the Inquiry Log, and sound is off by default
  {
    const mk = (id: string, mass: number, value?: number) => ({
      id, sandboxId: 'harmonic-oscillator', createdAt: new Date().toISOString(), prediction: value === undefined ? { text: 'p' } : { text: 'p', value, unit: 's' },
      parameters: { mass, springConstant: 5 }, measurement: { channel: 'x', value: 1 }, explanation: value === undefined ? '' : 'it got longer',
    });
    await page.goto(`${BASE}/#/`, { waitUntil: 'load' });
    await page.evaluate((entries) => localStorage.setItem('agentuto.inquiry-log.v1', JSON.stringify({ version: 1, entries })), [mk('m1', 1), mk('m2', 2, 1.4)]);
    await page.goto(`${BASE}/#/sandbox/harmonic-oscillator`, { waitUntil: 'load' });
    await page.reload({ waitUntil: 'load' }); // the log is read when an instrument opens, so open it fresh
    await page.waitForSelector('button[aria-label="Toggle the Inquiry Log"]', { timeout: 20000 }).catch(() => undefined);
    await page.click('button[aria-label="Toggle the Inquiry Log"]').catch(() => undefined);
    await page.waitForSelector('details[data-milestones]', { timeout: 10000 }).catch(() => undefined);
    const text = await page.$eval('details[data-milestones]', (el) => el.textContent ?? '').catch(() => 'no milestones list');
    const sound = await page.$eval('button[aria-label^="Sound"]', (b) => b.getAttribute('aria-pressed')).catch(() => 'no sound button');
    await page.evaluate(() => localStorage.removeItem('agentuto.inquiry-log.v1'));
    if (!/Changed one thing/.test(text) || !/Predicted, measured, explained/.test(text)) await bad('milestones', `list read "${text.slice(0, 160)}"`);
    else if (sound !== 'false') await bad('milestones', `sound button aria-pressed is ${sound}, expected false (off by default)`);
    else pass('milestones', 'earned from a seeded log; sound is off by default');
  }

  // Every course opens and lists its instruments
  for (const course of COURSES) {
    await page.goto(`${BASE}/#/course/${encodeURIComponent(course.id)}`, { waitUntil: 'load' });
    await page
      .waitForFunction((title) => document.querySelector('[data-site-page="course"] h1')?.textContent === title, { timeout: 20000 }, course.title)
      .catch(() => undefined);
    const rows = await page.$$eval('[data-site-page="course"] ol > li', (items) => items.length);
    if (rows !== course.modules.length) await bad(`course ${course.id}`, `${rows} instruments listed, expected ${course.modules.length}`);
    else pass(`course ${course.id}`, `${rows} instruments`);
  }

  // About and Instruments
  await page.goto(`${BASE}/#/about`, { waitUntil: 'load' });
  await page.waitForSelector('[data-site-page="about"] h1', { timeout: 20000 }).catch(() => undefined);
  const about = await page.$eval('[data-site-page="about"] h1', (h) => h.textContent ?? '').catch(() => 'no About page appeared');
  if (!/About/.test(about)) await bad('about page', `heading is "${about}"`);
  else pass('about page');

  await page.goto(`${BASE}/#/instruments`, { waitUntil: 'load' });
  await page.waitForSelector('[data-site-page="instruments"] article', { timeout: 20000 }).catch(() => undefined);
  const articles = await page.$$eval('[data-site-page="instruments"] article', (items) => items.length);
  if (articles < upstream) await bad('instruments page', `${articles} instruments, expected at least ${upstream}`);
  else pass('instruments page', `${articles} instruments`);

  // The guide's jump links scroll within the page; a bare "#section" would be read as a new address and leave it
  await page.goto(`${BASE}/#/guide`, { waitUntil: 'load' });
  const JUMP = '[data-site-page="guide"] nav[aria-label="Manual sections"] > :is(a, button)';
  await page.waitForSelector(JUMP, { timeout: 20000 }).catch(() => undefined);
  const jumps = await page.$$eval(JUMP, (items) => items.length);
  let guideProblem = jumps === 0 ? 'no jump links found' : '';
  for (let i = 0; i < jumps && !guideProblem; i++) {
    await page.$$eval(JUMP, (items, index) => (items[index] as HTMLElement).click(), i);
    await new Promise((r) => setTimeout(r, 300));
    const hash = await page.evaluate(() => location.hash);
    const heading = await page.$eval('[data-site-page="guide"] h1', (h) => h.textContent ?? '').catch(() => '');
    if (hash !== '#/guide' || !/guide/i.test(heading)) guideProblem = `jump link ${i + 1} left the page (address ${hash}, heading "${heading}")`;
  }
  if (guideProblem) await bad('user guide', guideProblem);
  else pass('user guide', `${jumps} jump links stay on the page`);

  // Search, with real key presses: "/" focuses, typing finds, Enter opens
  await page.goto(`${BASE}/#/`, { waitUntil: 'load' });
  await page.waitForSelector('input[role="combobox"]', { timeout: 20000 }).catch(() => undefined);
  await page.keyboard.press('/');
  await page.keyboard.type('lorentz');
  const found = await page
    .waitForSelector('[role="option"]', { timeout: 10000 })
    .then(() => page.$$eval('[role="option"]', (o) => o.map((x) => x.textContent ?? '')))
    .catch(() => [] as string[]);
  if (found.length === 0 || !/Lorentz/.test(found[0])) {
    await bad('search', `typing "lorentz" gave ${found.length === 0 ? 'no results' : `"${found[0]}" first`}`);
  } else {
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash === '#/sandbox/lorentz-force', { timeout: 10000 }).catch(() => undefined);
    const hash = await page.evaluate(() => location.hash);
    if (hash !== '#/sandbox/lorentz-force') await bad('search', `Enter opened ${hash}`);
    else pass('search', '"/" then "lorentz" then Enter opens the Lorentz instrument');
  }

  // An address that is nonsense lands on the home page, not a blank screen
  await page.goto(`${BASE}/#/nonsense/path`, { waitUntil: 'load' });
  await page.waitForSelector('#courses a', { timeout: 20000 }).catch(() => undefined);
  const stray = await page.$$eval('#courses a', (links) => links.length);
  if (stray < COURSES.length) await bad('unknown address', 'did not fall back to the course list');
  else pass('unknown address', 'opens the course list');

  if (problems.length > 0) {
    fail('site pages: errors while browsing', [...new Set(problems)].slice(0, 5).join('; '));
  } else {
    pass('site pages: no script errors, failed requests or HTTP errors');
  }
  await page.close();
}

async function checkPhone(browser: Browser, webgl: boolean): Promise<void> {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const problems: string[] = [];
  watch(page, problems);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

  for (const [label, hash] of [['home', '#/'], ['course', '#/course/8.02'], ['about', '#/about']] as const) {
    await page.goto(`${BASE}/${hash}`, { waitUntil: 'load' });
    await page.waitForSelector('[data-site-page] h1', { timeout: 20000 }).catch(() => undefined);
    if (await overflow()) {
      fail(`phone ${label}`, 'scrolls sideways');
      await snapshotOnFailure(page, `phone-${label}`);
    } else {
      pass(`phone ${label}`, 'no sideways scroll at 390 px');
    }
  }

  // A sandbox: the panels start closed so the apparatus has the screen
  const id = webgl ? 'lorentz-force' : 'harmonic-oscillator';
  await page.goto(`${BASE}/#/sandbox/${id}`, { waitUntil: 'load' });
  await page.waitForSelector('section[aria-label="Apparatus"] canvas', { timeout: 20000 }).catch(() => undefined);
  const state = await page.evaluate(() => ({
    left: (document.querySelector('aside[aria-label^="Parameters"]') as HTMLElement | null)?.hidden,
    right: (document.querySelector('aside[aria-label^="Telemetry"]') as HTMLElement | null)?.hidden,
    canvasWidth: document.querySelector('section[aria-label="Apparatus"] canvas')?.getBoundingClientRect().width ?? 0,
  }));
  if (!state.left || !state.right) fail('phone sandbox', 'the panels start open and would cover the apparatus');
  else if (state.canvasWidth < 300) fail('phone sandbox', `the apparatus is only ${Math.round(state.canvasWidth)} px wide`);
  else if (await overflow()) fail('phone sandbox', 'scrolls sideways');
  else pass('phone sandbox', `${id}: panels closed, apparatus ${Math.round(state.canvasWidth)} px wide`);

  if (problems.length > 0) fail('phone: errors while browsing', [...new Set(problems)].slice(0, 5).join('; '));
  await page.close();
}

async function main(): Promise<void> {
  if (existsSync(join(root, 'local'))) {
    console.log('Note: a local/ folder exists, so a build made here includes private modules and the counts below may differ.\n');
  }
  const chrome = findChrome();
  if (!chrome) {
    console.error('No Chrome, Chromium or Edge found. Install one, or set CHROME_PATH to its executable.');
    process.exit(2);
  }
  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      // CPU only: no graphics card, a software WebGL.
      '--disable-gpu',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  });
  try {
    const probe = await browser.newPage();
    await probe.goto('about:blank');
    const webgl = await probe.evaluate(() => {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    });
    await probe.close();
    console.log(`Browser: ${await browser.version()}; WebGL (software): ${webgl ? 'available' : 'not available'}\n`);

    console.log('Instruments');
    for (const id of Object.keys(SIMULATION_CATALOG)) {
      if (only && !only.includes(id)) continue;
      await checkSandbox(browser, id, webgl);
    }
    if (!only) {
      console.log('\nSite');
      await checkSite(browser);
      console.log('\nPhone');
      await checkPhone(browser, webgl);
    }
  } finally {
    await browser.close();
    server.stop();
  }

  console.log(
    failures.length === 0
      ? `\n${checks} checks passed.`
      : `\n${failures.length} of ${checks} checks failed:\n${failures.map((f) => `  - ${f}`).join('\n')}`,
  );
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
