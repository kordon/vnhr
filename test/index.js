var vnhr = process.env.VNHR_COV ? require('../lib-cov/vnhr') : require('../'),
    assert = require('assert')

suite('api')

test('constructs with a string', function () {
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

test('constructs with an array', function () {
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

test('constructs with no arguments', function () {
  var hr = vnhr()
  
  assert(Object.keys(hr.metadata).length === 0)
  assert(hr.ring.every(function(vnode) {
    return !vnode
  }))
})
