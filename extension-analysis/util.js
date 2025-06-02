function findExtraElements(preList, afterList) {
    const extraElements = [];
  
    for (let item2 of afterList) {
      const isInList1 = preList.some(item1 => areDictionariesEqual(item1, item2));
  
      if (!isInList1) {
        extraElements.push(item2);
      }
    }
  
    return extraElements;
};

function isInList(ele, list) {
    const isIn = list.some(item1 => areDictionariesEqual(item1, ele));
    return isIn
}


function removeDuplicates(list) {
    // console.log(list)
    const uniqueElements = new Map();

    for (const item of list) {
        const key = JSON.stringify(item);
        uniqueElements.set(key, item);
    }

    
    const res = Array.from(uniqueElements.values());
    // console.log(res);
    return res;
}


function areListsEqual(list1, list2) {
    if (list1.length !== list2.length) {
      return false;
    }
  
    for (let i = 0; i < list1.length; i++) {
      const dict1 = list1[i];
      const dict2 = list2[i];
  
      if (!areDictionariesEqual(dict1, dict2)) {
        return false;
      }
    }
  
    return true;
  };
  
  function areDictionariesEqual(dict1, dict2) {

    if (typeof dict1 !== "object" || typeof dict2 !== "object" || dict1 === null || dict2 === null) {
      return false;
    }
  
    const keys1 = Object.keys(dict1);
    const keys2 = Object.keys(dict2);
  
    if (keys1.length !== keys2.length) {
      return false;
    }
  
    for (const key of keys1) {
      if (!dict2.hasOwnProperty(key) || !deepEqual(dict1[key], dict2[key])) {
        return false;
      }
    }
  
    return true;
  };
  
  function deepEqual(val1, val2) {
    if (val1 === val2) {
      return true;
    }
  
    if (typeof val1 === "object" && typeof val2 === "object" && val1 !== null && val2 !== null) {
      return areDictionariesEqual(val1, val2);
    }
  
    return false;
  };

  async function waitForNoActivity(page, timeout = 3000) {
    
    await page.evaluate(() => {
      return new Promise(resolve => {
        const observer = new MutationObserver(() => {
          // reset timelock
          clearTimeout(window.__noActivityTimeout);
          window.__noActivityTimeout = setTimeout(() => {
            // if more than 3000 stop, check agaim
            observer.disconnect();

            resolve('No changes detected for 3 seconds');
          }, 3000);
        });
  
        // listen to the changes of the DOM
        observer.observe(document, { childList: true, subtree: true });
  
        // if no changes in 3s, resolve
        window.__noActivityTimeout = setTimeout(() => {
          observer.disconnect();
          resolve('No initial changes for 3 seconds');
        }, 3000);
      });
    });
  
    console.log('Continuing after no activity detected');
  }

  async function checkIfPageIsIdle(page) {
  
    // Evaluate inside the page's context
    const isIdle = await page.evaluate(() => {
      return new Promise((resolve) => {
        let idleTimeout;
        let mutationObserver = new MutationObserver(() => {
          // Reset the idle timeout if any mutation is detected
          clearTimeout(idleTimeout);
          idleTimeout = setTimeout(() => resolve(true), 3000);
        });
  
        // Observe changes to the entire body of the page
        mutationObserver.observe(document.body, {
          childList: true,       // Detect when child nodes are added or removed
          subtree: true,         // Detect changes in all child elements as well
          attributes: true,      // Detect changes to the attributes of elements
          characterData: true    // Detect changes to the text of elements
        });
  
        // Set a timer for 3 seconds, if no mutations occur, we consider the page idle
        idleTimeout = setTimeout(() => resolve(true), 3000);
      });
    });
  
    return isIdle;
  }

/**
 * 勾选“同意条款”类复选框（关键字出现即可，无需整句匹配）
 *
 * @param {import('puppeteer').Page} page        Puppeteer Page
 * @param {object}                   [opt]
 * @param {string[]}                 [opt.keywords]  关键词数组；默认已含常见中英文词
 * @param {number}                   [opt.timeout]   等待时间，默认 1 s
 * @returns {Promise<boolean>}  true = 找到并勾选，false = 未找到
 */
async function checkTermsBox(page, opt = {}) {
  const {
    timeout = 1000,
    keywords = [
      'agree', 'accept', 'terms', 'condition', 'privacy', 'policy', 'understand',
      '同意', '已阅读', '接受', '条款', '隐私',
    ],
  } = opt

  // 等待页面中出现至少一个复选框
  await page.waitForSelector('input[type="checkbox"]', { timeout });

  // 在页面上下文中查找所有匹配的复选框并点击
  const clickedCount = await page.evaluate(({ kw }) => {
    const words = kw.map(w => w.toLowerCase());

    const _visible = el => {
      const rect = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        s.display !== 'none' &&
        s.visibility !== 'hidden' &&
        s.opacity !== '0'
      );
    };

    const getText = cb => {
      if (cb.getAttribute('aria-label')) return cb.getAttribute('aria-label');
      if (cb.getAttribute('placeholder')) return cb.getAttribute('placeholder');

      if (cb.id) {
        const labelFor = document.querySelector(`label[for="${cb.id}"]`);
        if (labelFor) return labelFor.innerText;
      }

      const labelWrap = cb.closest('label');
      if (labelWrap) return labelWrap.innerText;

      const ids = cb.getAttribute('aria-labelledby');
      if (ids) {
        return ids
          .split(/\s+/)
          .map(id => document.getElementById(id)?.innerText ?? '')
          .join(' ');
      }

      return '';
    };

    // const checkboxes = [...document.querySelectorAll('input[type="checkbox"]:not([disabled])')];
    const checkboxes = [...document.querySelectorAll('input[type="checkbox"]:not([disabled])')];

    let clicked = 0;

    for (const cb of checkboxes) {
      if (!_visible(cb)) continue;

      const txt = getText(cb).toLowerCase();

      if (words.some(w => txt.includes(w))) {
        const target = cb.closest('label') || cb;
        try {
          target.scrollIntoView({ block: 'center' });
          target.click();
          clicked++;
        } catch (e) {
          console.warn('Failed to click checkbox:', e);
        }
      }
    }

    return clicked;
  }, { kw: keywords });

  return clickedCount > 0;
}


/* ---------- 3. Utility function: click by text ---------- */

async function clickButtonByText(page, label, opt = {}) {
  const { timeout = 10_000 } = opt;
  const isRegex  = label instanceof RegExp;
  const pattern  = isRegex ? label.source : label;

  // 1️⃣ 先等页面里出现“任何”候选元素
  await page.waitForSelector('button, [role="button"], [role^="link"]', {
    timeout,
  });

  // 2️⃣ 在页面端查找符合条件的那个
  const handle = await page.evaluateHandle(
    ({ pattern, isRegex }) => {
      const re = isRegex ? new RegExp(pattern, 'i') : null;

      function visible(el) {
        const s = window.getComputedStyle(el);
        return s && s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
      }

      const candidates = [
        ...document.querySelectorAll('button, [role="button"], [role^="link"]'),
      ];

      return (
        candidates.find(el => {
          if (!visible(el)) return false;
          const text = el.innerText.trim();
          return isRegex ? re.test(text) : text.includes(pattern);
        }) || null
      );
    },
    { pattern, isRegex }
  );

  if (!handle || (await handle.evaluate(node => node === null))) {
    throw new Error(`点击失败：未找到包含文本「${label}」的可点击元素`);
  }

  // 3️⃣ 点击
  await handle.asElement().click();
}


/* ---------- 4. Utility function: find input by hint ---------- */

async function findInputByHint(page, hint, opt = {}) {
  const { timeout = 10_000 } = opt;
  const isRegex = hint instanceof RegExp;
  const needle  = isRegex ? hint.source : hint;

  // 1️⃣ 等待页面出现任何潜在输入框
  await page.waitForSelector(
    'input:not([type=hidden]):not([disabled]):not([readonly]), ' +
    'textarea:not([disabled]):not([readonly]), ' +
    '[contenteditable="true"], ' +
    '[role="textbox"]',
    { timeout }
  );

  // 2️⃣ 在浏览器上下文中过滤
  const handle = await page.evaluateHandle(({ needle, isRegex }) => {
    const re = isRegex ? new RegExp(needle, 'i') : null;

    const visible = el => {
      const s = window.getComputedStyle(el);
      return s && s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    };

    // 收集候选元素
    const candidates = [
      ...document.querySelectorAll(
        'input:not([type=hidden]):not([disabled]):not([readonly]), ' +
        'textarea:not([disabled]):not([readonly]), ' +
        '[contenteditable="true"], ' +
        '[role="textbox"]'
      ),
    ];

    const matchText = txt =>
      txt && (isRegex ? re.test(txt) : txt.toLowerCase().includes(needle.toLowerCase()));

    // 遍历并判断
    for (const el of candidates) {
      if (!visible(el)) continue;

      // ① placeholder
      if (matchText(el.getAttribute('placeholder'))) return el;

      // ② aria-label
      if (matchText(el.getAttribute('aria-label'))) return el;

      // ③ aria-labelledby → 获取关联元素文本
      const alBy = el.getAttribute('aria-labelledby');
      if (alBy) {
        const labelledByText = [...alBy.split(/\s+/)]
          .map(id => document.getElementById(id))
          .filter(Boolean)
          .map(n => n.innerText.trim())
          .join(' ');
        if (matchText(labelledByText)) return el;
      }

      // ④ <label for=…>
      const id = el.id || el.getAttribute('name');
      if (id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (lbl && matchText(lbl.innerText.trim())) return el;
      }

      // ⑤ 包裹式 <label><input …> 文本</label>
      const parentLabel = el.closest('label');
      if (parentLabel && matchText(parentLabel.innerText.replace(el.innerText, '').trim()))
        return el;
    }
    return null;
  }, { needle, isRegex });

  const element = handle.asElement();
  if (!element) {
    throw new Error(`未找到提示词为「${hint}」的可编辑输入框`);
  }
  return element;
}



/* ---------- 5. Utility function: get unique selector ---------- */

/**
 * 生成当前文档里唯一的 CSS selector
 * @param {Element} el  目标 DOM 元素
 * @returns {string}    唯一选择器
 */
function getUniqueSelector(el) {
  if (!(el instanceof Element)) {
    throw new TypeError('need a DOM Element');
  }

  // ① 若元素带有唯一 id，直接用
  if (el.id && document.getElementById(el.id) === el) {
    return `#${CSS.escape(el.id)}`;
  }

  // ② 递归向上构造路径
  const parts = [];
  let node = el;

  while (node && node.nodeType === 1) {
    let part = node.localName;                 // tagName，已是小写

    // 用类名缩短（可选）
    if (node.classList.length) {
      part += '.' + [...node.classList].map(c => CSS.escape(c)).join('.');
    }

    // 若同类型节点不止一个，加 nth-of-type
    const sameTagSiblings = node.parentElement
      ? [...node.parentElement.children].filter(n => n.localName === node.localName)
      : [];
    if (sameTagSiblings.length > 1) {
      const idx = sameTagSiblings.indexOf(node) + 1; // 1-based
      part += `:nth-of-type(${idx})`;
    }

    parts.unshift(part);

    // 如果拼到 body 就停；否则继续向上
    node = node.parentElement;
    if (node === document.body) {
      parts.unshift('body');
      break;
    }
  }

  return parts.join(' > ');
}

  
export {isInList, findExtraElements, checkIfPageIsIdle, removeDuplicates, clickButtonByText, findInputByHint, checkTermsBox, waitForNoActivity, getUniqueSelector};