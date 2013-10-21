var vnhr = process.env.VNHR_COV ? require('../lib-cov/vnhr') : require('../'),
    utils = process.env.VNHR_COV ? require('../lib-cov/utils') : require('../src/utils'),
    interpolate = require('util').format,
    assert = require('assert')

suite('utils')

test('array', function () {
  var a = utils.array(100).map(function (n, i) {
    return i
  })

  a.forEach(function (n, i) {
    assert(n === i)
  })

  assert(a.length === 100)
})

test('slice', function () {
  // [1, 2, 3, 4, 5]
  var array = utils.array(5).map(function (n, i) {
    return i + 1
  })

  // main 0
  // [5, 1, 2]
  var a = utils.slice(array, 0, 3)
  assert(a.length === 3)

  assert(a[0] === 5)
  assert(a[1] === 1)
  assert(a[2] === 2)

  // main 1
  // [1, 2, 3]
  a = utils.slice(array, 1, 3)
  assert(a.length === 3)

  assert(a[0] === 1)
  assert(a[1] === 2)
  assert(a[2] === 3)

  // main 2
  // [2, 3, 4]
  a = utils.slice(array, 2, 3)
  assert(a.length === 3)

  assert(a[0] === 2)
  assert(a[1] === 3)
  assert(a[2] === 4)

  // main 3
  // [3, 4, 5]
  a = utils.slice(array, 3, 3)
  assert(a.length === 3)

  assert(a[0] === 3)
  assert(a[1] === 4)
  assert(a[2] === 5)

  // main 4
  // [4, 5, 1]
  a = utils.slice(array, 4, 3)
  assert(a.length === 3)

  assert(a[0] === 4)
  assert(a[1] === 5)
  assert(a[2] === 1)
})

suite('api')

test('construct with a string', function () {
  var hr = vnhr('192.168.0.102:11212')

  assert(Object.keys(hr.pnodes).length === 1)
  assert(hr.replicas === 3)
  assert(hr.ring.length === 1024)
  assert(Object.keys(hr.pnodes).length === 1)

  var pnodes = Object.keys(hr.pnodes).map(function (key) {
    return hr.pnodes[key]
  }).pop()

  assert(pnodes.name === '192.168.0.102:11212')
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
  assert(Object.keys(hr.pnodes).length === 3)

  assert(Object.keys(hr.pnodes).every(function (key) {
    var pnode = hr.pnodes[key]
    var asserted = true

    asserted = asserted && pnodes.indexOf(pnode.name) >= 0
    return asserted
  }))
})

test('construct with no arguments', function () {
  var hr = vnhr()

  assert(Object.keys(hr.pnodes).length === 0)
  assert(hr.ring.every(function(vnode) {
    return !vnode
  }))
})

test('add server after zero-argument constructor', function () {
  var server = '192.168.0.102:11212'
  var hr = vnhr()
  hr.push(server)

  assert(Object.keys(hr.pnodes).length === 1)
  assert(hr.ring.every(function(vpnode) {
    return hr.pnodes[vpnode.pnode].name === server
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

test('add pnode twice', function () {
  var pnodes = [
    '192.168.0.102:11212',
    '192.168.0.103:11213',
    '192.168.0.104:11214'
  ]

  var hr = vnhr(pnodes)

  assert(hr.push('192.168.0.104:11214') === false)
})

test('exceed pnode limit', function () {
  var hr = vnhr()
  var pnodes = {}

  utils.array(1024).map(function (n, i) {
    var pnode = utils.metadata(interpolate('192.168.0.102:%s', i))
    pnodes[pnode.id] = pnode
  })

  hr.pnodes = pnodes

  assert(hr.push('192.168.0.102:1024') === false)
})

test('get without pnodes', function () {
  assert(vnhr().get('foo') === false)
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

    return function (vpnode, i) {
      var name = hr.pnodes[vpnode.pnode].name

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

test('consistent results', function () {
  var pnodes = [
    '192.168.0.102:11212',
    '192.168.0.104:11214'
  ]

  var hr = vnhr(pnodes)

  var bar1 = {
    vpnodes: hr.get('bar')
  }

  hr.push('192.168.0.103:11213')

  var bar2 = {
    vpnodes: hr.get('bar')
  }

  bar1.names = bar1.vpnodes.map(function (result) {
    return result.pnode.name
  })

  bar1.main = bar1.vpnodes.filter(function (result) {
    return result.main
  }).map(function (vpnode) {
    return vpnode.pnode
  }).shift()

  bar2.names = bar2.vpnodes.map(function (result) {
    return result.pnode.name
  })

  bar2.main = bar2.vpnodes.filter(function (result) {
    return result.main
  }).map(function (vpnode) {
    return vpnode.pnode
  }).shift()

  assert(bar1.names.length === bar2.names.length)
  assert(bar1.names.indexOf(pnodes[0]) === bar2.names.indexOf(pnodes[0]))
  assert(bar1.names.indexOf(pnodes[1]) === bar2.names.indexOf(pnodes[1]))
  assert(bar1.names.indexOf(pnodes[2]) === bar2.names.indexOf(pnodes[2]))
  assert(bar1.main.name === bar2.main.name)
})

// test('handoff event', function (done) {
//   var my_server = '192.168.0.103:11213'
//   var hr = vnhr([my_server, '192.168.0.104:11214'])
//
//   hr.on('handoff', function (from, to) {
//     if(from.name !== my_server || to.name !== my_server) return
//   })
//
//   hr.push('192.168.0.102:11212')
// })