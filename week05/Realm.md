Realm

```js
let objects = [
  "eval",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "Array",
  "Date",
  "RegExp",
  "Promise",
  "Proxy",
  "Map",
  "WeakMap",
  "Set",
  "WeakSet",
  "Function",
  "Boolean",
  "String",
  "Number",
  "Symbol",
  "Object",
  "Error",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
  "ArrayBuffer",
  "SharedArrayBuffer",
  "DataView",
  "Float32Array",
  "Float64Array",
  "Int8Array",
  "Int16Array",
  "Int32Array",
  "Uint8Array",
  "Uint16Array",
  "Uint32Array",
  "Uint8ClampedArray",
  "Atomics",
  "JSON",
  "Math",
  "Reflect"
];
let queue = []
for (let p of objects) {
  queue.push({
    path: [p],
    object: this[p] // this === window
  })
}
console.log(queue, 'queue')
let set = new Set() // ignore duplicate key

while (queue.length) {
  current = queue.shift()
  console.log(current.object, current)
  if (set.has(current.object)) {
    continue // 如果有重复的object则直接跳到下一个循环中
  }
  set.add(current.object)
  if (current.object === 'undefined') {
  	debugger;
  }
  for (let p of Object.getOwnPropertyNames(current.object)) {
    // p 为 current的属性名字
    let property = Object.getOwnPropertyDescriptor(current.object, p) // 取到对象属性对应的属性描述符
    // 对value值进行判断
    if (property.hasOwnProperty('value') &&
      ((property.value !== null) && (typeof property.value === 'object') || (typeof property.value === 'function'))
      && property.value instanceof Object) {
      queue.push({
        path: current.path.concat([p]),
        object: property.value
      })
    }
    // getter
    if (property.hasOwnProperty('get') && (typeof property.get === 'function')) {
      queue.push({
        path: current.path.concat([p]),
        object: property.get
      })
    }
    // setter
    if (property.hasOwnProperty('set') && (typeof property.set === 'function')) {
      queue.push({
        path: current.path.concat([p]),
        object: property.set
      })
    }
  }
}
console.log(queue, 'after queue')
```



