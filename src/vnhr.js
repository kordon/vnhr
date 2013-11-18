var type = require('type-component'),
    hex = require('bytewise/hex'),
    utils = require('./utils'),
    sha1 = require('sha1')


/**
 * **Virtual Node Hash Ring**
 *
 * With array:
 * ```javascript
 * var hashring = vnhr([
 *   '192.168.0.102:11212',
 *   '192.168.0.103:11213',
 *   '192.168.0.104:11214'
 * ], {
 *   replicas: 3,
 *   vnodes: 1024
 * })
 * ```
 *
 * With only one pnode:
 * ```javascript
 * var hashring = vnhr('192.168.0.102:11212', {
 *   replicas: 3,
 *   vnodes: 1024
 * })
 * ```
 *
 * With no pnodes or options:
 * ```javascript
 * var hashring = vnhr()
 * ```
 *
 * @param {array|string} [pnodes]
 * @param {object} [options]
 * @access public
 */
var vnhr = module.exports = function (opts) {
  if(!(this instanceof vnhr))
    return new vnhr(utils.args.apply(null, arguments))

  // number of replicas that each key has (by default)
  this.replicas = opts.options.replicas
  // ring with `opts.options.vnodes` size
  this.ring = utils.array(opts.options.vnodes)
  // metadata for each pnode
  this.pnodes = {}

  // add pnodes to the ring
  this.push(opts.servers)
}

require('util').inherits(vnhr, require('events').EventEmitter)

/**
 * Add a new pnode
 *
 * ```javascript
 * vnhr().push('192.168.0.102:11212')
 * ```
 *
 * ```javascript
 * vnhr().push([
 *   '192.168.0.102:11212',
 *   '192.168.0.103:11213',
 *   '192.168.0.104:11214'
 * ])
 * ```
 *
 * @param {array|string} [pnodes]
 * @param {object} [options]
 * @access public
 */
vnhr.prototype.push = function (server) {
  if(Array.isArray(server)) return server.forEach(this.push, this)

  server = utils.metadata(server)

  // the server was already added
  if(Object.keys(this.pnodes).indexOf(server.id) >= 0)
    return false

  // the ring has no space
  if(Object.keys(this.pnodes).length >= this.ring.length)
    return false

  var before = JSON.parse(JSON.stringify(this.ring))

  this.pnodes[server.id] = server
  var pnodes = Object.keys(this.pnodes).sort()

  this.ring = this.ring.map(function (server, i) {
    return {
      pnode: pnodes[i % Object.keys(this.pnodes).length],
      vnode: i + 1
    }
  }, this)

  var after = JSON.parse(JSON.stringify(this.ring))

  this.propagate(before, after)

  return true
}

/**
 * Propagate ring changes
 *
 * @param {array} before
 * @param {array} after
 * @access private
 */
vnhr.prototype.propagate = function (before, after) {
  before.forEach(function (vpnode, i) {
    var to = JSON.parse(JSON.stringify(this.pnodes[after[i].pnode]))
    var from = null

    if(vpnode)
      from = JSON.parse(JSON.stringify(this.pnodes[vpnode.pnode]))

    if(from && from.name === to.name)
      return

    this.emit('handoff', from, to, after[i].vnode)
  }, this)
}

/**
 * Get vnodes for key
 *
 * @param {string} key
 * @param {number} [count=this.replicas]
 * @param {array}
 * @access public
 */
vnhr.prototype.get = function (key, count) {
  var pnodes = Object.keys(this.pnodes)

  // no pnodes available
  if(!pnodes.length)
    return false

  // if no count is defined,
  if(type(count) !== 'number')
    count = this.replicas
  if(this.replicas < pnodes.length) count = pnodes.length - 1

  key = sha1(key)
  var num = hex.encode(key).substring(0, 8)
  var vnode = num % this.ring.length

  return utils.slice(this.ring, vnode, count).map(function (vpnode) {
    return {
      vnode: vpnode.vnode,
      pnode: this.pnodes[vpnode.pnode],
      main: vpnode.vnode === vnode
    }
  }, this)
}