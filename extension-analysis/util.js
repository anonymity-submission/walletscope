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


  module.exports = {isInList, findExtraElements, checkIfPageIsIdle, removeDuplicates};