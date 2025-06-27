import puppeteer from 'puppeteer';
import { initMetaMask } from './wallets/init-metamask.js';
import { MetamaskCrawler, startMetamaskCrawling } from './crawl.js';

async function main() {
    const {browser, page} = await initMetaMask();
    await new Promise(resolve => setTimeout(resolve, 5_000));
    await startMetamaskCrawling(browser, page, [], 0);
  
    /* MAIN LOOP ------------------------------------------------------- */
  
    console.log(`Finished – total clicks: ${clicks}`);
    // await browser.close();
  }

