// crawl-metamask.js   (run with:  node crawl-metamask.js)
//
// • Assumes MetaMask is already loaded & unlocked in a Chrome instance that
//   was started by Puppeteer (or you pass userDataDir to reuse a profile).
// • Script will iterate through ALL clickable elements it can find and click
//   them once, discovering new ones after each click.

import puppeteer from 'puppeteer';
import { initMetaMask } from './wallets/init-metamask.js';

const STAMP = 'data-seen-by-crawler';                // prevents duplicates

/** selectors we treat as “clickable”                              */
const CLICK_SEL =
  'button, [role="button"], a[role="link"], div[role="button"]';

/** selectors we treat as “typable”                                */
const INPUT_SEL =
  'input:not([type=hidden]):not([disabled]), ' +
  'textarea:not([disabled]), ' +
  '[contenteditable="true"], [role="textbox"]';


/** ------------------------------------------------------------------ */
/** helper – in-page function: returns a list of NEW clickable nodes    */
function collectInteractiveHandles(clickSel=[], inputSel=[], stampAttr='') {
  const now = Date.now();

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
  const list = [...document.querySelectorAll(`${clickSel}, ${inputSel}`)]
    .filter(visible)
    // skip ones already stamped
    .filter(el => !el.hasAttribute(stampAttr));

  // stamp them so we never return the same node twice
  list.forEach(el => el.setAttribute(stampAttr, now));

  // sort by visual position (top-to-bottom, left-to-right) for determinism
  list.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });

  return list;
}

async function search(browser, page, path, visitedHashes, chains) {
  const originalPages = await browser.pages();
  
}

/** ------------------------------------------------------------------ */
async function main() {
  const {browser, page} = await initMetaMask();
  await new Promise(resolve => setTimeout(resolve, 5_000));

  const stampAttr = 'data-clicked-by-crawler';
  let clicks = 0;
  const start   = Date.now();
  const originalPages = await browser.pages();  


  /* MAIN LOOP ------------------------------------------------------- */
  while (true) {
    // collect NEW clickables
    const handles = await page.evaluateHandle(
      collectInteractiveHandles,
      CLICK_SEL,
      INPUT_SEL,
      stampAttr
    );
    const elements = await handles.getProperties();
    const list = [...elements.values()].map(h => h.asElement()).filter(Boolean);

    if (list.length === 0) {
      console.log('[✓] no more new buttons – stopping');
      break;
    }

    for (const el of list) {
      const txt = await page.evaluate(el => el.innerText || el.textContent, el);
      console.log(`   → clicking: [${txt.trim() || '<no-text>'}]`);
      await el.click();  // small human-like delay
      // await new Promise(resolve => setTimeout(resolve, 1000));
      // check if the front page is changed
      const newPages = await browser.pages();
      if (newPages.length > originalPages.length) {
        const newWindow = newPages.find(page => !originalPages.includes(page));
        if (newWindow) {
          await newWindow.goBack();
          await newWindow.close();  // close new windows
        }
      };
      
      var newHandles = await page.evaluateHandle(
        collectInteractiveHandles,
        CLICK_SEL,
        INPUT_SEL,
        stampAttr
      );
      var newElements = await newHandles.getProperties();
      var newList = [...newElements.values()].map(h => h.asElement()).filter(Boolean);
      // find handles that are not in the handles
      const diff = newList.filter(h => !list.includes(h));
      if (diff.length > 0) {
        console.log(diff)
        await new Promise(resolve => setTimeout(resolve, 10000000));
      }
    }
  }

  console.log(`Finished – total clicks: ${clicks}`);
  // await browser.close();
}



/**
 *  In-page function: gather NEW widgets (clickables + inputs) that
 *  haven’t been stamped yet.  They’ll be stamped with STAMP_ATTR so
 *  they’re never returned twice.
 *
 *  @param {string} STAMP_ATTR – an attribute name we set to mark “seen”
 *  @param {list} clickSel - 
 *  @param {list} inputSel
 *  @returns {Array<Element>}  – list of new elements (order top-left → bottom-right)
 */
function scanInteractives({STAMP, clickSel, inputSel}) {
    const visible = el => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 &&
             s.display !== 'none' && s.visibility !== 'hidden';
    };
  
    const list = [
      ...document.querySelectorAll(`${clickSel}, ${inputSel}`)
    ]
    console.log(list)
      .filter(visible)
      .filter(el => !el.hasAttribute(STAMP));
  
    const stampVal = Date.now();
    list.forEach(el => el.setAttribute(STAMP, stampVal));
  
    return list.map(el => ({
      // Transfer minimal info to Node side
      rect  : el.getBoundingClientRect(),
      outer : el.outerHTML.slice(0, 120),
    }));
}


main().catch(console.error);