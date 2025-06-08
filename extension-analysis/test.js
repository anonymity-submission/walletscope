import puppeteer from 'puppeteer';
import { initMetaMask } from './wallets/init-metamask.js';




// (async () => {
//   const {browser, page} = await initMetaMask();
//   await new Promise(resolve => setTimeout(resolve, 5_000));

//   /* 把 getUniqueSelector 函数注入到页面并执行一次 */
//   const selectors = await page.evaluate(() => {
//     const escapeCss = s => s.replace(/([ !"#$%&'()*+,.\/:;<=>?@[\]\\^`{|}~])/g, '\\$1');
//     function getUniqueSelector(el) {
//       if (el.id) return `#${escapeCss(el.id)}`;
//       const parts = [];
//       let node = el;
//       while (node && node.nodeType === 1) {
//         let part = node.localName;
//         if (node.classList.length) {
//           part += '.' + escapeCss(node.classList[0]);
//         }
//         const sibs = node.parentElement
//           ? [...node.parentElement.children]
//             .filter(n => n.localName === node.localName)
//           : [];
//         if (sibs.length > 1) {
//           part += `:nth-of-type(${sibs.indexOf(node) + 1})`;
//         }
//         parts.unshift(part);
//         node = node.parentElement;
//         if (node === document.body) {
//           parts.unshift('body');
//           break;
//         }
//       }
//       return parts.join(' > ');
//     }

//     return [...document.querySelectorAll('*')].map(getUniqueSelector);
//   });
//   for (const sel of selectors) {
//     console.log(sel)
//     }
//   console.log(`⚡ 抓到 ${selectors.length} 个 selector`);
//   console.log(selectors.slice(0, 10));

//   await browser.close();
// })();
