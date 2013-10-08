var type = require('type-component'),
    hex = require('bytewise/hex'),
    utils = require('./utils'),
    sha1 = require('sha1')


var vnhr = module.exports = function (opts) {
  if(!(this instanceof vnhr)) return new vnhr(utils.args.apply(null, arguments))
  
  this.replicas = opts.options.replicas
  this.vnodes = opts.options.vnodes
  this.ring = utils.array(this.vnodes)
  this.metadata = Object()
  this.pnodes = Array()

  opts.servers.forEach(this.push, this)
}

require('util').inherits(vnhr, require('events').EventEmitter)

vnhr.prototype.push = function (server) {
  server = utils.metadata(server)
  
  if(this.pnodes.indexOf(server.id) >= 0) return false
  
  var before = JSON.parse(JSON.stringify(this.ring))
  
  this.metadata[server.id] = server
  this.pnodes.push(server.id)
  this.pnodes = this.pnodes.sort()
  
  this.ring = this.ring.map(function (server, i) {
    return this.pnodes[i % Object.keys(this.metadata).length]
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

vnhr.prototype.vnode = function (key, count) {
  if(!this.pnodes.length) return false
  if(type(count) !== 'number') count = this.replicas
  if(this.replicas < this.pnodes.length) count = this.pnodes.length - 1
  
  key = sha1(key)
  var num = hex.encode(key).substring(0, 8)
  var vnode = num % this.ring.length

  return this.ring.splice(vnode - count, count).map(function (vnode) {
    return this.metadata[vnode]
  }, this)
}