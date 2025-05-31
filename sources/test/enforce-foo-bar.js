const util = require('util');

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description: "Enforce that a variable named `foo` can only be assigned a value of 'bar'."
        },
        fixable: "code",
        schema: []
    },
    create(context) {
        let callStack = [];

        function trackBackwards(node) {
            // 追踪调用链，找到最终的事件调用
            let currentNode = node;
            while (currentNode) {
              if (
                currentNode.type === 'CallExpression' &&
                currentNode.callee.type === 'MemberExpression' &&
                currentNode.callee.property.name === 'addListener'
              ) {
              //   console.log(JSON.stringify(currentNode, null, 2))
                context.report({
                  node: currentNode,
                  message: 'Tracked backwards to event listener invocation {{identifier}}',
                  data: {
                      // identifier: node.callee
                      identifier: (util.inspect(node.parent, { showHidden: false, depth: null, colors: true })),
                  }
                });
                break;
              }
              currentNode = currentNode.parent;
            }
          }

        return {
          // 捕捉 chrome.runtime.onMessageExternal.addListener 调用
          CallExpression(node) {
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.property.name === 'addListener' &&
              node.callee.object.type === 'MemberExpression' &&
              node.callee.object.property.name === 'onMessageExternal'
            ) {
                console.log(context)
              // 获取当前调用栈中的函数名（如果有）
              const ancestors = context.getAncestors();
              const currentFunction = ancestors.find(
                (ancestor) =>
                  ancestor.type === 'FunctionDeclaration' ||
                  ancestor.type === 'FunctionExpression' ||
                  ancestor.type === 'ArrowFunctionExpression'
              );

              const functionName =
                currentFunction && currentFunction.id
                  ? currentFunction.id.name
                  : 'anonymous function';

              // 添加到调用栈
              callStack.push(functionName);


              // 继续追踪这个函数的调用路径
              context.getAncestors().forEach((ancestor) => {
                if (ancestor.type === 'VariableDeclarator') {
                  const variableName = ancestor.id.name;
                  context.report({
                    node: ancestor,
                    message: `Found variable ${variableName} that eventually calls chrome.runtime.onMessageExternal.addListener`,
                  });
                  console.log(
                    `Reverse tracing from 'onMessageExternal.addListener' led to variable ${variableName}`
                  );
                }
              });

              // 输出详细的调用栈信息
              console.log(
                `Reverse call trace: ${callStack.reverse().join(' -> ')}`
              );
            } else {
                console.log(context)
            }
          },
        };
      },
};
