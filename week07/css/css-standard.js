let list = document.getElementById('container').children
let result = []
for (let item of list) {
  if (item.getAttribute('data-tag').match(/css/)) {
    let children = item.children
    result.push({
      name: children[1].innerText,
      url: children[1].children[0].href
    })
  }
}
console.log(JSON.stringify(result))