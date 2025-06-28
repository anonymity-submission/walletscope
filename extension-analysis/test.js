import puppeteer from 'puppeteer';
import { initMetaMask } from './wallets/init-metamask.js';
import { startMetamaskCrawling } from './crawler.js';

async function main() {
    // const {browser, page} = await initMetaMask();
    // await new Promise(resolve => setTimeout(resolve, 5_000));
    const result = await startMetamaskCrawling({
        headless: false,  
        maxDepth: 6,
        waitTime: 1000
    });
    console.log(result);
    await result.browser.close();
}

main().catch(console.error);

