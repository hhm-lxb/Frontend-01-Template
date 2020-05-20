const EOF = Symbol('EOF') // End of File
let currentToken = null // tag
let currentAttribute = null
let currentTextNode = null
let stack = [{ type: 'document', children: [] }]
function emitToken (token) {
  let top = stack[stack.length - 1]
  if (token.type === 'startTag') {
    let element = {
      type: 'element',
      children: [],
      attributes: []
    }
    element.tagName = token.tagName
    for (let p in token) {
      if (p !== 'type' && p !== 'tagName') {
        element.attributes.push({
          name: p,
          value: token[p]
        })
      }
    }
    top.children.push(element)
    element.parentNode = top
    currentTextNode = null
    // 不是自封闭标签
    if (!token.isSelfClosing) {
      stack.push(element)
    }
  } else if (token.type === 'endTag') {
    if (top.tagName !== token.tagName) {
      throw new Error("Tag start end doesn't match !")
    } else {
      stack.pop()
    }
    currentTextNode = null
  } else if (token.type === 'text') {
    if (currentTextNode === null) {
      currentTextNode = {
        type: 'text',
        content: ''
      }
      top.children.push(currentTextNode)
    }
    currentTextNode.content += token.content
  }
}
// init state
function data (c) {
  if (c === '<') {
    return tagOpen
  } else if (c === EOF) {
    emitToken({
      type: 'EOF'
    })
    return 
  } else {
    emitToken({
      type: 'text',
      content: c
    })
    return data
  }
}

function tagOpen (c) {
  if (c === '/') {
    return endTagOpen
  } else if (c.match(/^[a-zA-Z]$/)) {
    emitToken({
      type: 'startTag',
      tagName: ''
    })
    return tagName(c)
  } else {
    return
  }
}

function beforeAttributeName (c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName
  } else if (c === '>' || c === '/' || c === EOF) {
    return afterAttributeName(c)
  } else if (c === '=') {
    return beforeAttributeName
  } else {
    currentAttribute = {
      name: '',
      value: ''
    }
    return attributeName(c)
  }
}

function beforeAttributeValue (c) {
  if (c.match(/^[\t\n\f ]$/) || c === '>' || c === '/' || c === EOF) {
    return afterAttributeValue
  } else if (c === '"') {
    return doubleQuotedAttributeValue
  } else if (c === "'") {
    return singleQuotedAttributeValue
  } else {
    return unQuotedAttributeValue(c)
  }
}

function attributeName (c) {
  if (c === '>' || c === '/' || c === EOF || c.match(/^[\t\n\f ]$/)) {
    return afterAttributeName
  } else if (c === '=') {
    return beforeAttributeValue
  } else if (c === '\u0000') {

  } else if (c === '\"' || c === "'" || c === '<') {

  } else {
    currentAttribute.name += c
    return attributeName
  }
}

function afterAttributeName () {}
function tagName (c) {  
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName
  } else if (c === '/') {
    return selfClosingStartTag
  } else if (c.match(/^[a-zA-Z]$/)) {
    currentToken.tagName += c.toLowerCase()
    return tagName
  } else if (c === '>') {
    emitToken(currentToken)
    return data
  } else {
    currentToken.tagName += c.toLowerCase()
    return tagName
  }
}

function selfClosingStartTag (c) {
  if (c === '>') {
    currentToken.isSelfClosing = true
    return data
  } else if (c === 'EOF') {}  
}
module.exports = {
  parseHTML (html) {
    let state = data
    for (let c of html) {
      state = state(c)
    }
    state = state(EOF)
  }
}