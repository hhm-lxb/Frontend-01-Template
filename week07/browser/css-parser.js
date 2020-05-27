const css = require('css')
const rules = [] // css Rules
// 把css rules 暂存到一个数组中去
// 收集css rules规则
function addCssRULES (text) {
  let ast = css.parse(text)
  rules.push(...ast.stylesheet.rules)
}
// 给元素应用css rules
function computeCss (element, stack) {
  let elements = stack.slice().reverse()
  let matched = false
  if (!element.computedStyle) {
    element.computedStyle = {}
  }
  for (let rule of rules) {
    let selectorPart = rule.selector[0].split(' ').reverse()
    // 如果选择器最后一个不匹配当前元素
    if (!match(element, selectorPart[0])) {
      continue
    }
    let j = 1
    for (let i = 0; i < elements.length; i++) {
      if (match(elements[i], selectorPart[j])) {
        j++
      }
    }
    if (j >= selectorPart.length) {
      matched = true
    }
    // 匹配成功
    if(matched) {
      let sp = specificity(rule.selectors[0])
      let computedStyle = element.computedStyle
      for (let declaration of rule.declaration) {
        if (!computedStyle[declaration.property]) { 
          computedStyle[declaration.property] = {}
        }
        // 判断优先级
        if (!computedStyle[declaration.specificity]) { 
          computedStyle[declaration.property].value = declaration.value
          computedStyle[declaration.specificity].specificity = sp
        } else if (compare(computedStyle[declaration.specificity].specificity, sp) < 0) {
          computedStyle[declaration.property].value = declaration.value
          computedStyle[declaration.specificity].specificity = sp
        }
      }
    }
  }
}
// 匹配规则
function match (element, selector) {
  if (!selector || !element.attribute) {
    return false
  }
  if (selector.charAt(0) === '#') {
    let attr = element.attribute.filter(attr => attr.name === 'id')[0]
    if (attr && attr.value === selector.replace('#', '')) {
      return true
    }
  } else if (selector.charAt(0) === '.') {
    let attr = element.attribute.filter(attr => attr.name === 'class')[0]
    if (attr && attr.value === selector.replace('.', '')) {
      return true
    }
  } else {
    if (element.tagName === selector) {
      return true
    }
  }
  return false
}

function specificity (selector) {
  let p = [0, 0, 0, 0]
  let selectorPart = selector.split(' ')
  for (let part of selectorPart) {
    if (part.charAt(0) === '#') {
      p[1] += 1
    } else if (part.charAt(0) === '.') {
      p[2] += 1
    } else {
      p[3] += 1
    }
  }
  return p
}
// 比较优先级 高位开始比较，不为零则直接得出优先级
function compare (sp1, sp2) {
  if (sp1[0] - sp2[0]) {
    return sp1[0] - sp2[0]
  } else if (sp1[1] - sp2[1]) {
    return sp1[1] - sp2[1]
  } else if (sp1[2] - sp2[2]) {
    return sp1[2] - sp2[2]
  }
  return sp1[3] - sp2[3]
}
module.exports = {
  addCssRULES,
  computeCss
}