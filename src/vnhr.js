var type = require('type-component'),
    hex = require('bytewise/hex'),
    utils = require('./utils'),
    sha1 = require('sha1')


var vnhr = module.exports = function (opts) {
  if(!(this instanceof vnhr)) return new vnhr(utils.args.apply(null, arguments))
  
  this.replicas = opts.options.replicas
  this.ring = utils.array(opts.options.vnodes)
  this.metadata = Object()

  opts.servers.forEach(this.push, this)
}

require('util').inherits(vnhr, require('events').EventEmitter)

vnhr.prototype.push = function (server) {
  server = utils.metadata(server)
  
  if(Object.keys(this.metadata).indexOf(server.id) >= 0) return false
  var before = JSON.parse(JSON.stringify(this.ring))
  
  this.metadata[server.id] = server
  var pnodes = Object.keys(this.metadata).sort()
  
  this.ring = this.ring.map(function (server, i) {
    return pnodes[i % Object.keys(this.metadata).length]
  }, this)
  
  var after = JSON.parse(JSON.stringify(this.ring))
  this.propagate(before, after)
}

vnhr.prototype.propagate = function (before, after) {
  if(before.length > after.length) before.forEach(function (vnode, i) {
    if(i < after.length) return
    
    this.emit('rm', this.metadata[vnode], i)
  }, this)
  
  before.forEach(function (vnode, i) {
    this.emit('handoff', this.metadata[vnode], this.metadata[after[i]], i)
  }, this)
  
  if(before.length < after.length) after.forEach(function (vnode, i) {
    if(i < before.length) return
    
    this.emit('add', this.metadata[vnode], i)
  }, this)
}

vnhr.prototype.get = function (key, count) {
  var pnodes = Object.keys(this.metadata)
  
  if(!pnodes.length) return false
  if(type(count) !== 'number') count = this.replicas
  if(this.replicas < pnodes.length) count = pnodes.length - 1
  
  key = sha1(key)
  var num = hex.encode(key).substring(0, 8)
  var vnode = num % this.ring.length

  return this.ring.map(function (pnode, vnode) {
    return [pnode, vnode]
  }).splice(vnode - count + 1, count).map(function (vpnode) {
    return {
      pnode: this.metadata[vpnode[0]],
      vnode: vpnode[1],
      main: vpnode[1] === vnode
    }
  }, this)
}