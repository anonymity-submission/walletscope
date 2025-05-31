
function removeDuplicates(list) {
    const uniqueElements = new Map();
  
    for (const item of list) {
      // 将字典对象转换为 JSON 字符串以用作唯一标识符
      const key = JSON.stringify(item);
      uniqueElements.set(key, item);
    }
  
    return Array.from(uniqueElements.values());
  }

const li = [
    {
        "a": 1, "b": 2
    },
    {
        "c": "222", "d": "333"
    },
    {
        "c": "222", "d": "333"
    }
]

console.log(removeDuplicates(li));
