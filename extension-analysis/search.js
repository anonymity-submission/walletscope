// crawl-extension.js  —  run with:  node crawl-extension.js
// ------------------------------------------------------------
// 1.  `launch-chrome.js` (or your own runner) must already have a Chrome
//     instance open and write its CDP endpoint to  /tmp/pptr-ws
// 2.  The extension must be unlocked / ready to use.
// ------------------------------------------------------------
import puppeteer from 'puppeteer';
import fs        from 'node:fs/promises';
import { initMetaMask } from './wallets/init-metamask.js';

// ───────────────────────── constants ─────────────────────────
const WS_PATH   = '/tmp/pptr-ws';                // endpoint file from script-A
const EXT_ID    = 'gfbcggkpcdpiiihmopfbhabfeabcccaf';       // MetaMask
const ROOT_URL  = `chrome-extension://${EXT_ID}`;
const STAMP     = 'data-seen-by-crawler';        // DOM attribute
const CLICK_SEL = 'button,[role="button"],a[role="link"],div[role="button"]';
const INPUT_SEL = 'input:not([type=hidden]):not([disabled]),' +
                  'textarea:not([disabled]),' +
                  '[contenteditable="true"],[role="textbox"]';
const POPUP_WAIT = 1_500;                        // ms
const NAV_WAIT   = 2_000;                        // ms
const PAUSE      = 350;                          // ms between clicks
const MAX_DEPTH  = 120;                          // failsafe


// ─── helper: safe click (closes popup, notes nav) ────────────
async function clickAndObserve(page, el) {
  const navP   = page.waitForNavigation({ timeout: NAV_WAIT,
                                          waitUntil: 'domcontentloaded' })
                     .catch(() => null);
  const popupP = page.on('popup', { timeout: POPUP_WAIT });
                    //  .catch(() => null);

  await el.click({ delay: 35 });
  const [popup, nav] = await Promise.all([popupP, navP]);
  return { popup, navigated: !!nav };
}

// ─── helper: dummy-fill inputs so they count as “touched” ────
async function fillDummy(page, el) {
  const tag = await el.evaluate(n => n.tagName);
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    await el.click({ clickCount: 3 });
    await page.keyboard.type('dummy');
  } else {
    await el.focus();
    await page.keyboard.type('dummy');
  }
}

// ─── helper: derive human label for a clickable/input ────────
async function labelOf(el) {
  return (await el.evaluate(n =>
    (n.getAttribute('aria-label') ||
     n.getAttribute('placeholder') ||
     n.innerText || n.value || n.id || n.name || n.tagName)
      // .trim()
  )).slice(0, 60) || '<unlabelled>';
}

// ─── in-page scanner (returns clickables[] & inputs[]) ────────
function scanInteractives(STAMP, clickSel, inputSel) {
  function cssEscape(ident) {
    return ident.replace(/([ !"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
  }

  function getUniqueSelector(el) {
    if (!(el instanceof Element)) {
      throw new TypeError('need a DOM Element');
    }

    if (el.id && document.getElementById(el.id) === el) {
      return `#${cssEscape(el.id)}`;
    }

    const parts = [];
    let node = el;

    while (node && node.nodeType === 1) {
      let part = node.localName;

      if (node.classList.length) {
        part += '.' + [...node.classList].map(c => cssEscape(c)).join('.');
      }

      const sameTagSiblings = node.parentElement
        ? [...node.parentElement.children].filter(n => n.localName === node.localName)
        : [];
      if (sameTagSiblings.length > 1) {
        const idx = sameTagSiblings.indexOf(node) + 1;
        part += `:nth-of-type(${idx})`;
      }

      parts.unshift(part);

      node = node.parentElement;
      if (node === document.body) {
        parts.unshift('body');
        break;
      }
    }

    return parts.join(' > ');
  }

  // find *visible* elements matching our selectors
  const visible = el => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return (
      r.width > 0 && r.height > 0 &&
      s.display !== 'none' && s.visibility !== 'hidden'
    );
  };

  /** convert NodeList→Array & filter */
  // const list = [...document.querySelectorAll(`${clickSel}, ${inputSel}`)]
  return Array.from(
    document.querySelectorAll(`${clickSel}, ${inputSel}`)
  )
    .filter(visible)
    // skip ones already stamped
    .filter(el => !el.hasAttribute(STAMP))
    .map(el => {
      el.setAttribute(STAMP, Date.now());

      const tag   = el.tagName.toLowerCase();
      const type  = el.matches(inputSel) ? 'input'
                  : el.matches(clickSel) ? 'click'
                  : 'other';
      // el.setAttribute('element-type', type);
      // el.setAttribute('tagName', tag);
      // console.log(el.getAttribute('element-type'));
      // return el;
      return {
        type,
        tag,
        text: (el.innerText || el.value || ''),
        outer : el.outerHTML.slice(0, 120),
        selector: getUniqueSelector(el)
      };
    });
}

// ─── DFS crawler (core algorithm) ─────────────────────────────
async function crawl(page, path, viewHashes, outputs, depth = 0) {
  if (depth > MAX_DEPTH) return;                        // failsafe

  // de-dup view
  const fp = await page.evaluate(() =>
    location.href + '|' + document.body.innerText.length);
  if (viewHashes.has(fp)) return;
  viewHashes.add(fp); 

  // discover new widgets
  await new Promise(resolve => setTimeout(resolve, 1000));
  const handles = await page.evaluate(
    scanInteractives,  
    STAMP,
    CLICK_SEL,
    INPUT_SEL
  );
  console.log(handles);
  // record inputs and clicks
  const inputs = handles.filter(n => n.type === 'input');
  const clicks = handles.filter(n => n.type === 'click');


  if (inputs != undefined && inputs.length > 0) {
    for (const idx of inputs.keys()) {
        const selector   = `${INPUT_SEL}:nth-of-type(${idx + 1})`;
        outputs.push({ path: [...path], selector });
      }
  }

  if (clicks != undefined && clicks.length > 0) {
    // loop through clickables
    for (const el of clicks) {
      // rebuild ElementHandle (scan返的是 Node refs, but not serialisable)
      const txt = await page.evaluate(el => el.text, el);

      const element = await page.$(el.selector);
      const { popup, navigated } = await clickAndObserve(page, element);
      console.log(`   → clicking: [${txt || '<no-text>'}]`);

      // await element.click(); 
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const label = await labelOf(element);
      path.push(label);

      // const handles = await page.$$(`${CLICK_SEL}, ${INPUT_SEL}`);

      // for (const h of handles) {
      //   const marked = await h.evaluate(
      //     (node, stamp) => node.hasAttribute(stamp),  // 把 stamp 当参数传进去
      //     STAMP                                       // 这里把 STAMP 传给上面的 stamp
      //   );
      // }

      // const handle = (await page.$$(`${CLICK_SEL}, ${INPUT_SEL}`))
      //   .find(async h => await h.evaluate(n => n.hasAttribute(STAMP)));

      // if (!handle) continue;                             // might disappear

      if (popup) {
        await crawl(popup, path, viewHashes, outputs, depth + 1);
        await popup.close();
      } else if (navigated) {
        await crawl(page, path, viewHashes, outputs, depth + 1);
        // backtrack
        try { await page.goBack({ waitUntil: 'domcontentloaded',
                                  timeout: NAV_WAIT }); }
        catch {/* ignore */}
      } else {
        // DOM mutated but URL unchanged – stay and recurse
        await crawl(page, path, viewHashes, outputs, depth + 1);
      }
        path.pop();
      }
  }
}

// ─── main driver ─────────────────────────────────────────────
(async () => {
  const { browser, page } = await initMetaMask();
  const outputs = [];                  // {path:[], selector:''}
  
  await crawl(page, [], new Set(), outputs);

  console.log('\n─ Inputs discovered ─');
  outputs.forEach((o, i) => {
    console.log(`#${i + 1}`, o.path.join(' → '), '⇒', o.selector);
  });

  // optional: persist JSON
  // await fs.writeFile('input-paths.json', JSON.stringify(outputs, null, 2));

  await browser.disconnect();          // leave Chrome alive for next run
})();
