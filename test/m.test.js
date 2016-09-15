var expect = require('chai').expect;
var C = {
    host:'localhost',
    database:'yf-fast-platform',
    username:'dbadmin',
    password:'741235896',
    showSql:true
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
                table: "api_app",
                condition: "delflag=0",
                fields: "*"
            };
            M.first(arg).then(function (data) {
                done();
            }).catch(function (err) {
                done(err);
            });
        });
        it('#First Object Condition', function (done) {
            var arg = {
                table: "api_app",
                condition: [
                  ['appid' , '=' , '10001'],
                  "appkey = '45883198abcdc109'",
                  ['or',['appname' ,'=','DEV_Activity']]
                ],
                fields: "id,appid,appname,apptype"
            };
            M.first(arg).then(function (data) {
                done();
            }).catch(function (err) {
                done(err);
            });
        });
        it('#findAndCount', function (done) {
            var arg = {
                table: "api_app",
                condition: "delflag=0",
                fields: "*"
            };
            M.findAndCount(arg).then(function (data) {
              console.log(data.rows[0].appkey);
                done();
            }).catch(function (err) {
                done(err);
            });
        });

    });

});
