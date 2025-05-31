// test.js

function createOffscreen() {
  const { chrome } = globalThis;
  if (!chrome.offscreen) {
    return;
  }

  let offscreenDocumentLoadedListener;
  const loadPromise = new Promise((resolve) => {
    offscreenDocumentLoadedListener = (msg) => {
      if (
        msg.target === OffscreenCommunicationTarget.extensionMain &&
        msg.isBooted
      ) {
        chrome.runtime.onMessageExternal.removeListener(
          offscreenDocumentLoadedListener,
        );
        resolve();

        if (process.env.IN_TEST && msg.webdriverPresent) {
          getSocketBackgroundToMocha();
        }
      }
    };
    chrome.runtime.onMessageExternal.addListener(offscreenDocumentLoadedListener);
  });
}

const a = offscreen()