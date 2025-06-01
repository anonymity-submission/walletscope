const {setMetaMask} = require('./wallets/metaMask.js')
const {findExtraElements, checkIfPageIsIdle, isInList, removeDuplicates} = require('./util.js')
const fs = require('fs');
const { get } = require('http');

// Puppeteer configuration to connect to Metamask extension
const metamaskExtensionPath = '/Users/siahu/Library/Application Support/Google/Chrome/Default/Extensions/nkbihfbeogaeaoehlefnkodbefgpgknn/12.6.2_0';

async function getClickableElements(page) {
  const ele =  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('button, a, [role="button"], [onclick]'));
    return elements.map(element => ({
      tagName: element.tagName,
      textContent: element.textContent.trim(),
      ariaLabel: element.getAttribute('aria-label'),
      id: element.id,
      class: element.className,
      href: element.href || null,
    }));
  });
  return [removeDuplicates(ele)];
}

async function getSelectableElements(page) {
  const ele = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));

    // return elements in select
    return selects.map(select => ({
      tagName: select.tagName,
      id: select.id,
      name: select.name,
      className: select.className,
      options: Array.from(select.options).map(option => ({
        text: option.text,
        value: option.value,
        selected: option.selected
      }))
    }));
  });
  return [removeDuplicates(ele)];
}

async function getInputableElements(page) {
  const ele = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]'));
    return inputs.map(input => ({
        tagName: input.tagName,
        type: input.type || null, // null if not an input element
        name: input.name || null,
        placeholder: input.placeholder || null,
        id: input.id || null,
    }));
  });
  return [removeDuplicates(ele)];
}

async function checkInputType(page) {
  return await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    return inputs.map(input => {
      // obtain attributes in inputs
      const inputDetails = {
        tagName: input.tagName,
        type: input.type || 'text', 
        placeholder: input.placeholder || null,
        name: input.name || null,
        id: input.id || null,
        value: input.value || null,
        required: input.required || false,
        pattern: input.pattern || null,
        maxlength: input.maxLength > 0 ? input.maxLength : null,
        minlength: input.minLength > 0 ? input.minLength : null,
        label: null,  // to store the text around
        nearbyText: null 
      };

      // 
      const label = document.querySelector(`label[for="${input.id}"]`) || input.closest('label');
      if (label) {
        inputDetails.label = label.innerText.trim();
      }

      // look for nearby text, find <span>, <p> or other common hint elements
      const nearbyText = input.closest('div, form')?.querySelector('span, p');
      if (nearbyText) {
        inputDetails.nearbyText = nearbyText.innerText.trim();
      }
      return inputDetails;
    });
  })
};

async function getAllDivs(page) {
  return await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));    
    return allDivs.map(div => div.outerHTML); 
    });
};

// ============================================================================ main function ==========================================================================
let num = 0


async function clickElements (browser, page, clicked, newClickable) {
  // const initialDivs = await getAllDivs(page);
  const originalPages = await browser.pages();  
  let initialClickableEle = findExtraElements(clicked, newClickable) 

  console.log("begin clicking", num);
  for (let i = 0; i < initialClickableEle.length; i++) {
    const element = initialClickableEle[i];
    // contains por...term, continue
    console.log(typeof(element.textContent));
    const textContent = element.textContent.toLowerCase();
    if (textContent.includes("portfolio") || textContent.toLowerCase().includes("term") || textContent.toLowerCase().includes("learn") ) {
      continue;
    };
    
    // already clicked, continue
    const isIn = isInList(element, clicked)
    if (isIn) {
      continue;
    }

    // use unique selector to lock element
    const selector = element.id 
      ? `#${element.id}` 
      : element.href 
        ? `a[href="${element.href}"]`
        : `button[class="${element.class}"]`;

    try {
      console.log(element)
      let preClick = await getClickableElements(page);
      await page.waitForSelector(selector, { timeout: 3000 });
      await page.click(selector);
      clicked.push(element)  // push in the clicked element list

      // let isIdle = await checkIfPageIsIdle(extensionPage, 3000);
      // if (!isIdle) {
      //   continue;
      // }
      await new Promise(resolve => setTimeout(resolve,3000));  
      
      const newPages = await browser.pages();

      // check if any new windows
      if (newPages.length > originalPages.length) {
        const newWindow = newPages.find(page => !originalPages.includes(page));
        if (newWindow) {
          await newWindow.goBack();
          await newWindow.close();  // close new windows
        }
      };

      // check type limitations of each element
      let inputType = await checkInputType(page);
      for (let i=0; i<inputType.length; i++) {
        const inEle = inputType[i];
        if (inEle.tagName.toLowerCase().includes("INPUT")) {
          
        }
      }
      if (inputType.length > 0) {
        console.log("InputType Limitations\n", inputType)
        // await new Promise(resolve => setTimeout(resolve, 300000));  // wait for 300s
      };

      // check if any new elements after clicking
      let afterClick = await getClickableElements(page); //obtain all clickable elements

      const addedEle = findExtraElements(preClick, afterClick);
      console.log("extra clickable elements", addedEle.length)


      // check if any new windows
      if (addedEle.length > 0) {
        num++;
        clickElements(browser, page, clicked, addedEle);  // recursive call
        num--;
      }
    
      // check if any select elements
      // let selectElements = await getSelectableElements(page);
      // if (selectElements.length > 0) {
      //   console.log("get selectable elements")
      //   console.log(selectElements);        
      //   await new Promise(resolve => setTimeout(resolve, 3000));  // wait for 3s
      // };
 
      
    } catch (err) {
      // console.error(`Could not click on element with selector: ${selector}`, err);
    }
  }
  return;
}


// begin testing
(async () => {
  let clicked = []
  let {browser, page} = await setMetaMask(metamaskExtensionPath);  //set wallet 
  let clickableEle = await getClickableElements(page);
  // await clickElements(browser, page, clicked, clickableEle);
})();
