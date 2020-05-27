const images = require('images')
function render (viewport, element) {
  if (element.style) {
    const { width, height, left, top } = element.style
    let img = images(width, height)

    if (element.style['background-color']) {
      let color = element.style['background-color'] || 'rgb(0,0,0)'
      color.match(/rgb\((\d+),(\d+),(\d+))/)
      img.fill(Number(RegExp.$1), Number(RegExp.$2), Number(RegExp.$3))
      viewport.draw(img, left || 0, top || 0)
    }
  }
}  

module.exports = {
  render
}