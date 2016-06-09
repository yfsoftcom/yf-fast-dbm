var expect = require('chai').expect;
var C = {
    host:'192.168.1.218',
    database:'gr_api',
    username:'dbadmin',
    password:'87252798',
};
var M = require('../index.js')(C);
describe('Fast DB M', function() {
    describe('#Count()', function () {
        it('count a table', function (done) {
            M.count({table:'api_app'}).then(function (c) {
                expect(c).to.equal(11);
                done()
            }).catch(function (err) {
                done(err);
            });
        });
    });
});
