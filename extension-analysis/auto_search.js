// crawl-metamask.js   (run with:  node crawl-metamask.js)
//
// • Assumes MetaMask is already loaded & unlocked in a Chrome instance that
//   was started by Puppeteer (or you pass userDataDir to reuse a profile).
// • Script will iterate through ALL clickable elements it can find and click
//   them once, discovering new ones after each click.

import puppeteer, { connect } from 'puppeteer';
import { initMetaMask } from './wallets/init-metamask.js';
import { dumpElementDetails, getXPathFromOuterHTML } from './util.js';

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

async function depthOf(el) {
  return (await el.evaluate(n =>
    n.getAttribute('depth-by-crawler')
  ));
}

async function cancleButton(clickList) {
  for (const el of clickList) {
    const txt = await labelOf(el);
    if (txt === "Cancel" || txt === "Close" || txt === "Back" || txt === "Back to Home") {
      return el;
    }
  }
  return null;
}

async function getLists(handles, depthAttr) {
  const clickArrayHandle  = await handles.getProperty('clickList');
  const inputArrayHandle  = await handles.getProperty('inputList');
  const eleDepthHandle = await handles.getProperty('eleDepth_');

  const clickList = [];
  const clickProps = await clickArrayHandle.getProperties();
  clickList.push(
    ...clickProps.values()
    .map(h => h.asElement())
    .filter(Boolean)
  );

  const inputList = [];
  const inputProps = await inputArrayHandle.getProperties();
  inputList.push(
    ...inputProps.values()
    .map(h => h.asElement())
    .filter(Boolean)
  );
  
  const eleDepthList_ = [];
  const eleDepthProps = await eleDepthHandle.getProperties();
  eleDepthList_.push(
    ...eleDepthProps.values()
    .map(h => h.asElement())
    .filter(Boolean)
  );

  const eleDepthList = [];
  for (const el of eleDepthList_) {
    const depth = await depthOf(el);
    eleDepthList.push(depth);
  }

  // get all the depthAttr attribute values of these elements

  return {clickList, inputList, eleDepthList};
}

async function search(browser, page, path, depth=0) {
  const originalPages = await browser.pages();
  const depthAttr = 'depth-by-crawler';
  var globalGraph = {};

  // collect NEW clickables
  const handles = await page.evaluateHandle(
    collectInteractiveHandles,
    CLICK_SEL,
    INPUT_SEL,
    depthAttr,
    depth
  );

  const {
    clickList: clickList,
    inputList: inputList,
    eleDepthList: eleDepthList
  } = await getLists(handles, depthAttr);

  console.log(eleDepthList)
  // get all el.innerText
  const txts = await Promise.all(clickList.map(el => labelOf(el)));
  console.log(txts)

  if (clickList.length === 0) {
    console.log('[✓] no more new buttons – stopping, [depth:', depth, ']');
    return;
  }

  await subsearch(browser, globalGraph, path, clickList, inputList, depth+1, clickList[0]);
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
    .filter(el => !el.hasAttribute(depthAttr));
  
  clickList.forEach(el => el.setAttribute(depthAttr, depth));

  clickList.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });

  const inputList = [...document.querySelectorAll(`${inputSel}`)]
    .filter(visible)
    .filter(el => !el.hasAttribute(depthAttr));

  inputList.forEach(el => el.setAttribute(depthAttr, depth));

  inputList.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });
   
  const eleDepth_ = [...document.querySelectorAll(`${clickSel}`)]
    .filter(visible)
    .filter(el => el.hasAttribute(depthAttr));

  eleDepth_.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });
  return {clickList, inputList, eleDepth_};
}

async function subsearch(browser, globalGraph, path, toClick, toInput, depth=0, currentEl=null) {
  const originalPages = await browser.pages();
  const depthAttr = 'depth-by-crawler';
  
  for (const el of toClick) {
    const txt = await labelOf(el);

    if (depth === 1 && txt === "Account 1") {
      continue
    }
    if (txt === "Confirm") {
      break;
    }
    if (txt === "Close" || txt === "Back" || txt === "Back to Home") {
      continue;
    }
    if (txt !== "Swap" && depth === 1) {
      continue;
    }
    
    console.log(`   → clicking: [${txt}]`);
    await el.click();  // small human-like delay
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    // path.push(txt);
    path.push(el);

    // check if the front page is changed
    const newPages = await browser.pages();
    if (newPages.length > originalPages.length) {

      const newWindow = newPages.find(
        page => !originalPages.includes(page)
      );

      if (newWindow) {
        await newWindow.goBack();
        await newWindow.close();  // close new windows
      }
    }

    const newHandles = await newPages[1].evaluateHandle(
      collectInteractiveHandles,
      CLICK_SEL,
      INPUT_SEL,
      depthAttr,
      depth + 1
    );
    
    const {
      clickList: newClickList,
      inputList: newInputList,
      eleDepthList: newEleDepthList
    } = await getLists(newHandles, depthAttr);


    // console.log(newClickList)
    
    if (newClickList.length === 0) {
      //it means it page returns to the previous page.
      console.log('[✓] no more new clicks – stopping, [ depth:', depth, ']');
      const txt = await labelOf(currentEl);

      console.log(`   → clicking: [${txt}]`);
      await currentEl.click();

      // await currentEl.click();
      // const cancleEl = await cancleButton(newClickList);
      // if (cancleEl) {
      //   await cancleEl.click();
      // } else {
      // }

      await new Promise(resolve => setTimeout(resolve, 2000));

    } else if (depth > 3 && newInputList.length === 0) {
      console.log('[✓] depth > 3 and no more new inputs – stopping, [ depth:', depth, ']');
      // break;
      continue;
    }
    
    const newToClick = newClickList.filter(
      h => !toClick.includes(h)
    );
    const newToInput = newInputList.filter(
      h => !toInput.includes(h)
    );
    
    if (newToClick.length > 0) {
      await subsearch(browser, globalGraph, path, newToClick, newToInput, depth + 1, el);
    } else if (newToInput.length > 0){
      /*** record the path to input ***/

      for (const el of newToInput) {
        label = await labelOf(el);
        if (!globalGraph[label]) {
          globalGraph[label] = [];
        } 
        globalGraph[label].push({
          path: path,
          depth: depth
        })
      }
      console.log('[✓] no more new buttons – beginning inputs, [depth:', depth, ']');
      break;
    }
  }
}


/** ------------------------------------------------------------------ */
async function main() {
  const {browser, page} = await initMetaMask();
  await new Promise(resolve => setTimeout(resolve, 5_000));
  await search(browser, page, [], 0);
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