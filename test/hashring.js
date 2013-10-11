// it('swaps servers', function () {
//   var ring = new Hashring([
//         '192.168.0.102:11212'
//       , '192.168.0.103:11212'
//       , '192.168.0.104:11212'
//     ])
//     , amazon = ring.get('justdied')
//     , skynet = '192.168.0.128:11212';
// 
//   ring.swap(amazon, skynet);
//   ring.cache.get("justdied").should.equal(skynet);
// 
//   // After a cleared cache, it should still resolve to the same server
//   ring.cache.reset();
//   ring.get('justdied').should.equal(skynet);
// });
// 
// it('removes servers', function () {
//   var ring = new Hashring([
//       '192.168.0.102:11212'
//     , '192.168.0.103:11212'
//     , '192.168.0.104:11212'
//   ]);
// 
//   ring.remove('192.168.0.102:11212');
//   ring.ring.forEach(function (node) {
//     node.server.should.not.equal('192.168.0.102:11212');
//   });
// });
// 
// it('Removes the last server', function () {
//   var ring = new Hashring('192.168.0.102:11212');
//   ring.remove('192.168.0.102:11212');
// 
//   ring.servers.should.have.length(0);
//   ring.ring.should.have.length(0);
// })