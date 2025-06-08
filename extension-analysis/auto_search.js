// crawl-metamask.js   (run with:  node crawl-metamask.js)
//
// • Assumes MetaMask is already loaded & unlocked in a Chrome instance that
//   was started by Puppeteer (or you pass userDataDir to reuse a profile).
// • Script will iterate through ALL clickable elements it can find and click
//   them once, discovering new ones after each click.

import puppeteer from 'puppeteer';
import { initMetaMask } from './wallets/init-metamask.js';
import { dumpElementDetails, getXPathFromOuterHTML } from './util.js';

const STAMP = 'data-seen-by-crawler';                // prevents duplicates

/** selectors we treat as “clickable”                              */
const CLICK_SEL =
  'button, [role="button"], a[role="link"], div[role="button"]';

/** selectors we treat as “typable”                                */
const INPUT_SEL =
  'input:not([type=hidden]):not([disabled]), ' +
  'textarea:not([disabled]), ' +
  '[contenteditable="true"], [role="textbox"]';


async function labelOf(el) {
  return (await el.evaluate(n =>
    (n.getAttribute('aria-label') ||
      n.getAttribute('placeholder') ||
      n.innerText || n.textContent || n.value || n.id || n.name || n.tagName)
      // .trim()
  )).slice(0, 60) || '<unlabelled>';
}

/** ------------------------------------------------------------------ */
/** helper – in-page function: returns a list of NEW clickable nodes    */
function collectInteractiveHandles(clickSel=[], inputSel=[], depthAttr='', depth=0) {
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
  const clickList = [...document.querySelectorAll(`${clickSel}`)]
    .filter(visible)
    // skip ones already stamped
    .filter(el => !el.hasAttribute(depthAttr));

  // stamp them so we never return the same node twice
  clickList.forEach(el => el.setAttribute(depthAttr, depth));

  // sort by visual position (top-to-bottom, left-to-right) for determinism
  clickList.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });

  const inputList = [...document.querySelectorAll(`${inputSel}`)]
    .filter(visible)
    // skip ones already stamped
    .filter(el => !el.hasAttribute(depthAttr));

  // stamp them so we never return the same node twice
  inputList.forEach(el => el.setAttribute(depthAttr, depth));

  // sort by visual position (top-to-bottom, left-to-right) for determinism
  inputList.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });

  return {clickList, inputList};
}

async function subsearch(browser, page, globalGraph, path, toClick, toInput, depth=0) {
  const originalPages = await browser.pages();
  const depthAttr = 'depth-by-crawler';
  
  for (const el of toClick) {
    console.log(await labelOf(el), "depth:", depth)
    await el.click();  // small human-like delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    const label = await labelOf(el);
    path.push(label);
    const newPages = await browser.pages();
    if (newPages.length > originalPages.length) {
      const newWindow = newPages.find(page => !originalPages.includes(page));
      if (newWindow) {
        await newWindow.goBack();
        await newWindow.close();  // close new windows
      }
    }
    const {clickHandles, inputHandles} = await page.evaluateHandle(
      collectInteractiveHandles,
      CLICK_SEL,
      INPUT_SEL,
      depthAttr,
      depth
    );
        
    // if the depth > 3 and no inputs, return
    if (depth > 3 && inputHandles.length === 0) {
      console.log('[✓] no more new inputs – stopping, [ depth:', depth, ']');
      break;
    }

    const clickElements = await clickHandles.getProperties();
    const inputElements = await inputHandles.getProperties();

    const clickList = [...clickElements.values()].map(h => h.asElement()).filter(Boolean);
    const inputList = [...inputElements.values()].map(h => h.asElement()).filter(Boolean);
    
    const newToClick = clickList.filter(h => !toClick.includes(h));
    const newToInput = inputList.filter(h => !toInput.includes(h));
    
    if (newToClick.length > 0) {
      await subsearch(browser, page, path, newToClick, newToInput, depth + 1);
    } else if (newToInput.length > 0){
      /*** record the path to input ***/

      for (const el of newToInput) {
        var label = await labelOf(el);
        if (!globalGraph[label]) {
          globalGraph[label] = [];
        } 
        globalGraph[label].push({
          path: path,
          depth: depth
        })
      }
      console.log('[✓] no more new buttons – stopping, [depth:', depth, ']');
      break;
    }
  }
}






async function search(browser, page, path, depth=0) {
  const originalPages = await browser.pages();
  const depthAttr = 'depth-by-crawler';

  // collect NEW clickables
  const handles = await page.evaluateHandle(
    collectInteractiveHandles,
    CLICK_SEL,
    INPUT_SEL,
    depthAttr,
    depth
  );
  const elements = await handles.getProperties();
  const list = [...elements.values()].map(h => h.asElement()).filter(Boolean);

  // get all el.innerText
  const txts = await Promise.all(list.map(el => labelOf(el)));
  console.log(txts)

  if (list.length === 0) {
    console.log('[✓] no more new buttons – stopping, [depth:', depth, ']');
    return;
  }

  for (const el of list) {
    const txt = await labelOf(el);
    console.log(`   → clicking: [${txt}]`);
    await el.click();  // small human-like delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    const label = await labelOf(el);
    path.push(label);
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
      depthAttr,
      depth + 1
    );
    var newElements = await newHandles.getProperties();
    // filter out elements that have depth attribute and depth is greater than depth
    var newList = [...newElements.values()].map(h => h.asElement()).filter(Boolean);

    // find handles that are not in the handles
    const diff = newList.filter(h => !list.includes(h));

    if (diff.length > 0) {
      // for (const el of newList) {
      // }
      console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
      await subsearch(browser, page, path, diff, depth + 1);

    }
  }

}

/** ------------------------------------------------------------------ */
async function main() {
  const {browser, page} = await initMetaMask();
  await new Promise(resolve => setTimeout(resolve, 5_000));
  const outputs = [];                  // {path:[], selector:''}
  await search(browser, page, [], outputs);
  let clicks = 0;
  const start   = Date.now();
  const originalPages = await browser.pages();  


  /* MAIN LOOP ------------------------------------------------------- */


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