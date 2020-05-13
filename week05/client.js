const net = require('net')

class Request {
  // method, url = host + port + path
  // body: k/v
  // headers

  constructor(options) {
    this.method = options.method || 'GET'
    this.host = options.host
    this.path = options.path || '/'
    this.port = options.port || 80
    this.body = options.body || {}
    this.headers = options.headers || {}
    // default Content-Type
    if (!this.headers['Content-Type']) {
      this.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }

    if (this.headers['Content-Type'] === 'application/json') {
      this.bodyText = JSON.stringify(this.body)
    }
    if (this.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
      this.bodyText = Object.keys(this.body)
        .map((key) => {
          return `${key}=${encodeURIComponent(this.body[key])}`
        })
        .join('&')
    }
    // necessary
    this.headers['Content-Length'] = this.bodyText.length
  }

  toString() {
    return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}
\r
${this.bodyText}`
  }

  open(method, url) {}

  send(connection) {
    return new Promise((resolve, reject) => {
      const parser = new ResponseParser()
      if (connection) {
        connection.write(this.toString())
      } else {
        connection = net.createConnection({
          host: this.host,
          port: this.port
        }, () => {
          connection.write(this.toString())
        })
      }
      connection.on('data', data => {
        parser.receive(data.toString())
        if (parser.isFinish) {
          console.log(parser.response, 'isFinish')
          resolve(parser.response)
          // console.log(parser.response)
        }
        connection.end()
      })
      connection.on('error', err => {
        reject(err)
        connection.end()
      })
    })
  }
}

class Response {

}

// Processing character stream
class ResponseParser {
  constructor () {
    this.WAITING_STATUS_LINE = 0 // 一开始处理相应行
    this.WAITING_STATUS_LINE_END = 1 // 响应行行结束 (\r\n)
    this.WAITING_HEADER_NAME = 2 // headerName
    this.WAITING_HEADER_SPACE = 3 // headerName遇到冒号后切换 (Content-Type: 12)
    this.WAITING_HEADER_VALUE = 4 // 如果headerName后面有冒号， 进入到读取header值的
    this.WAITING_HEADER_LINE_END = 5 // 一对header值结束 (\r\n)
    this.WAITING_HEADER_BLOCK_END = 6 // header结束 (有两个空格)
    this.WAITING_BODY = 7 // 读取body数据
    this.currentStatus = this.WAITING_STATUS_LINE // 当前状态
    this.statusLine = '' // 存放状态
    this.headers = {}
    this.headerName = ''
    this.headerValue = ''
    this.bodyParser = null
  }
  // body是否完成读取
  get isFinish () {
    return this.bodyParser && this.bodyParser.isFinish
  }
  get response () {
    this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/)
    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2.replace(/[\r\n]/g, ''),
      header: this.headers,
      body: this.bodyParser.content.join('').replace(/[\r\n]/g, '')
    }
  }
  // reset header (k/v)
  resetHeader () {
    this.headerName = ''
    this.headerValue = ''
  }
  receive (string) {
    for (let i = 0; i < string.length; i++) {
      this.receiveChar(string.charAt(i))
    }
  }
  receiveChar (char) {
    // 读取响应行
    if (this.currentStatus === this.WAITING_STATUS_LINE) {
      if (this.currentStatus === '\r') {
        // 响应行读取完，切换状态
        this.currentStatus = this.WAITING_STATUS_LINE_END
      } else if (char === '\n') {
        this.currentStatus = this.WAITING_HEADER_NAME
      } else {
        this.statusLine += char
      }
    } else if (this.currentStatus === this.WAITING_HEADER_NAME) {
      // 开始读取响应头字段
      if (char === ':') {
        // 遇到冒号
        this.currentStatus = this.WAITING_HEADER_SPACE
      } else if (char === '\r') {
        // 如果读取header第一个字符为回车时, 切换成读取header完成状态
        this.currentStatus = this.WAITING_HEADER_BLOCK_END
        if (this.headers['Transfer-Encoding'] === 'chunked') {
          // 生成一个bodyParser
          this.bodyParser = new TrunkedBodyParser()
        }
      } else {
        this.headerName += char
      }
    } else if (this.currentStatus === this.WAITING_HEADER_SPACE) {
      // 读取响应头(冒号)
      // 冒号后面等一个空格
      if (char === ' ') {
        // 开始读取响应头字段对应的value
        this.currentStatus = this.WAITING_HEADER_VALUE
      }
    } else if (this.currentStatus === this.WAITING_HEADER_VALUE) {
      // 读取响应头value
      if (char === '\r') {
        // 换行回车
        this.headers[this.headerName] = this.headerValue // 写入headers
        console.log(this.headers, 'headers')
        this.resetHeader()
        this.currentStatus = this.WAITING_HEADER_LINE_END
      } else {
        this.headerValue += char
      }
    } else if (this.currentStatus === this.WAITING_HEADER_LINE_END) {
      if (char === '\n') {
        this.currentStatus = this.WAITING_HEADER_NAME
      }
    }  else if (this.currentStatus === this.WAITING_HEADER_BLOCK_END) {
      // 读取完header
      if (char === '\n') {
        this.currentStatus = this.WAITING_BODY
      }
    } else if (this.currentStatus === this.WAITING_BODY) {
      // 开始解析body
      console.log(char)
      this.bodyParser.receiveChar(char)
    }
  }
}

class TrunkedBodyParser {
  constructor () {
    this.WAITING_LENGTH = 0
    this.WAITING_LENGTH_LINE_END = 1
    this.READING_TRUNK = 2
    this.WAITING_NEW_LINE = 3
    this.WAITING_NEW_LINE_END = 4
    this.isFinish = false // 是否已经完成全部读取
    this.currentStatus = this.WAITING_LENGTH
    this.length = 0
    this.content = []
  }
  receiveChar (char) {
    // console.log(char, 'char')
    if (this.currentStatus === this.WAITING_LENGTH) {
      if (char === '\r') {
        if (this.length === 0) {
          this.isFinish = true
        }
        this.currentStatus = this.WAITING_LENGTH_LINE_END
      } else {
        this.length *= 10
        this.length += char.charCodeAt(0) - '0'.charCodeAt(0)
        console.log(this.length, 'length')
      }
    } else if (this.currentStatus === this.WAITING_LENGTH_LINE_END) {
      if (char === '\n') {
        this.currentStatus = this.READING_TRUNK
      }
    } else if (this.currentStatus === this.READING_TRUNK) {
      console.log(char, 'trunk')
      this.content.push(char)
      this.length--
      if (this.length === 0) {
        // 当前长度读取完成
        this.currentStatus = this.WAITING_NEW_LINE
      }
    } else if (this.currentStatus === this.WAITING_NEW_LINE) {
      if (char === '\r') {
        this.currentStatus = this.WAITING_NEW_LINE_END
      }
    } else if (this.currentStatus === this.WAITING_NEW_LINE_END) {
      if (char === '\n') {
        this.currentStatus = this.WAITING_LENGTH
      }
    }
  }
}


void async function () {
  let request = new Request({
    method: 'POST',
    host: '127.0.0.1',
    port: '8088',
    path: '/',
    body: {
      name: 'hhm'
    }
  })
  // console.log(request.toString())
  let response = await request.send()
}()

