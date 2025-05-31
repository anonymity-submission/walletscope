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
        function trackBackwards(node) {
          // backtrace to find the final event call
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
          CallExpression(node) {
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.property.name === 'addListener' &&
              node.callee.object.type === 'MemberExpression' &&
              node.callee.object.property.name === 'onMessageExternal'
            ) {
              // backtrace to find the event source
              trackBackwards(node);
            }
          },
        };      
    }
};