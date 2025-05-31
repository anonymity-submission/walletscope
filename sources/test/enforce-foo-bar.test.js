const {RuleTester} = require("eslint");
const fooBarRule = require("./enforce-foo-bar");

const ruleTester = new RuleTester({
  // Must use at least ecmaVersion 2015 because
  // that's when `const` variables were introduced.
  // parserOptions: {
  //   ecmaVersion: 2021, // 设置合适的 ECMAScript 版本
  //   sourceType: 'module',
  // },
});
// Throws error if the tests in ruleTester.run() do not pass
ruleTester.run(
  "enforce-foo-bar", // rule name
  fooBarRule, // rule code
  { // checks
    // 'valid' checks cases that should pass
    valid: [{
      code: "chrome.runtime.onMessage.addListener(onMessageReceived);"
    }],
    // 'invalid' checks cases that should not pass
    invalid: [{
      code: "chrome.runtime.onMessageExternal.addListener(onMessageReceived);",
      // output: "const foo = 'baz';",
      // output: 'use onMessageExternal',
      errors: 1,
    }],
  }
);

console.log("All tests passed!");