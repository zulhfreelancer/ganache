import EventEmitter from 'events'
import { fork } from 'child_process'
import path from 'path'

// https://github.com/electron/electron/blob/cd0aa4a956cb7a13cbe0e12029e6156c3e892924/docs/api/process.md#process-object

class ChainService extends EventEmitter {
  constructor(app) {
    super()
    this.app = app
    this.child = null
    this.serverStarted = false
  }

  start() {
    let chainPath = path.join(__dirname, "../", "chain.js")
    const options = {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    };
    this.child = fork(chainPath, [], options)
    this.child.on('message', (message) => {
      if (message.type == "process-started") {
        this.emit("start")
      }
      if (message.type == "server-started") {
        this.serverStarted = true
      }
      if (message.type == "server-stopped") {
        this.serverStarted = false
      }
      this.emit(message.type, message.data)
    })
    this.child.on('error', (error) => {
      this.emit("error", error.stack || error)
    })
    this.child.on('exit', this._exitHandler);
    this.child.stdout.on('data', (data) => {
      // Remove all \r's and the final line ending
      this.emit("stdout", data.toString().replace(/\r/g, "").replace(/\n$/, ""))
    });
    this.child.stderr.on('data', (data) => {
      // Remove all \r's and the final line ending
      this.emit("stderr", data.toString().replace(/\r/g, "").replace(/\n$/, ""))
    });
  }
  
  _exitHandler(code, signal) {
      if (code != null) {
        this.emit("error", `Blockchain process exited prematurely with code '${code}', due to signal '${signal}'.`)
      } else {
        this.emit("error", `Blockchain process exited prematurely due to signal '${signal}'.`)
      }
  }

  startServer(options) {
    this.child.send({
      type: 'start-server',
      data: options
    })
  }

  stopServer(options) {
    this.child.send({
      type: 'stop-server',
    })
  }

  stopProcess() {
    this.child.removeListener('exit', this._exitHandler);
    if (this.child) {
      this.child.kill('SIGHUP');
    }
  }

  isServerStarted() {
    return this.isServerStarted
  }
}

export default ChainService
