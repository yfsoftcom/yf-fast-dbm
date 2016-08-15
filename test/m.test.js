var expect = require('chai').expect;
var C = {
    host:'192.168.1.218',
    database:'gr_ec',
    username:'dbadmin',
    password:'87252798',
};
var M = require('../index.js')(C);
describe('Fast DB M', function() {
    //describe('#Count()', function () {
    //    it('count a table', function (done) {
    //        M.count({table:'api_app'}).then(function (c) {
    //            expect(c).to.equal(11);
    //            done()
    //        }).catch(function (err) {
    //            done(err);
    //        });
    //    });
    //});

    describe('#FDM()', function () {
        it('#First', function (done) {
            var arg = {
                table: "gr_exploration",
                condition: "delflag=0",
                fields: "id,article,ptags,product"
            };
            M.first(arg).then(function (data) {
                done();
            }).catch(function (err) {
                done(err);
            });
        });
    });

});
