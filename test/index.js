var vnhr = require('../')

var hr = vnhr([
  '192.168.0.102:11212',
  '192.168.0.103:11212',
  '192.168.0.104:11212'
])

console.log(hr.vnode('teste'))