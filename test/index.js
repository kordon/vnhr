var vnhr = process.env.VNHR_COV ? require('../lib-cov/vnhr') : require('../'),
    assert = require('assert')

suite('api')

test('construct with a string', function () {
  var hr = vnhr('192.168.0.102:11212')

  assert(Object.keys(hr.metadata).length === 1)
  assert(hr.replicas === 3)
  assert(hr.ring.length === 1024)
  assert(Object.keys(hr.metadata).length === 1)
  
  var metadata = Object.keys(hr.metadata).map(function (key) {
    return hr.metadata[key]
  }).pop()
  
  assert(metadata.name === '192.168.0.102:11212')
})

test('construct with an array', function () {
  var pnodes = [
    '192.168.0.102:11212',
    '192.168.0.103:11212',
    '192.168.0.104:11212'
  ]
  
  var hr = vnhr(pnodes)

  assert(hr.replicas === 3)
  assert(hr.ring.length === 1024)
  assert(Object.keys(hr.metadata).length === 3)

  assert(Object.keys(hr.metadata).every(function (key) {
    var pnode = hr.metadata[key]
    var asserted = true
    
    asserted = asserted && pnodes.indexOf(pnode.name) >= 0
    return asserted
  }))
})

test('construct with no arguments', function () {
  var hr = vnhr()
  
  assert(Object.keys(hr.metadata).length === 0)
  assert(hr.ring.every(function(vnode) {
    return !vnode
  }))
})

test('add server after zero-argument constructor', function () {
  var server = '192.168.0.102:11212'
  var hr = vnhr()
  hr.push(server)
  
  assert(Object.keys(hr.metadata).length === 1)
  assert(hr.ring.every(function(vnode) {
    return hr.metadata[vnode].name === server
  }))
})

test('key lookup', function () {
  var pnodes = [
    '192.168.0.102:11212',
    '192.168.0.103:11213',
    '192.168.0.104:11214'
  ]
  
  var hr = vnhr(pnodes)
  
  var bar = {
    vpnodes: hr.get('bar')
  }
  
  var foo = {
    vpnodes: hr.get('foo')
  }  
  
  bar.names = bar.vpnodes.map(function (result) {
    return result.pnode.name
  })
  
  bar.main = bar.vpnodes.filter(function (result) {
    return result.main
  }).map(function (vpnode) {
    return vpnode.pnode
  }).shift()
  
  foo.names = foo.vpnodes.map(function (result) {
    return result.pnode.name
  })
  
  foo.main = foo.vpnodes.filter(function (result) {
    return result.main
  }).map(function (vpnode) {
    return vpnode.pnode
  }).shift()
  
  
  assert(foo.names.length === 3)
  assert(foo.names.indexOf(pnodes[0]) >= 0)
  assert(foo.names.indexOf(pnodes[1]) >= 0)
  assert(foo.names.indexOf(pnodes[2]) >= 0)
  
  assert(bar.names.length === 3)
  assert(bar.names.indexOf(pnodes[0]) >= 0)
  assert(bar.names.indexOf(pnodes[1]) >= 0)
  assert(bar.names.indexOf(pnodes[2]) >= 0)
  
  assert(bar.main.name !== foo.main.name)
})

test('even distribution', function () {
  var hr = vnhr([
    '192.168.0.102:11212',
    '192.168.0.103:11213',
    '192.168.0.104:11214'
  ])
  
  var servers = []

  hr.ring.forEach((function () {
    var bef, prev
    
    return function (vnode, i) {
      var name = hr.metadata[vnode].name
      
      if(!bef) {
        bef = name
        return
      }
      
      if(!prev) {
        prev = name
        return
      }
      
      assert(name !== bef)
      assert(name !== prev)
      assert(prev !== bef)
      
      bef = prev
      prev = name
    }
  })())
})