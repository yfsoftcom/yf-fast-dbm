var Schema = require('jugglingdb').Schema;
var _ = require('underscore');
var fastDBM = require('./lib/fastDBM.js');
module.exports = function(option){
    var option = _.extend({
        host:'localhost',
        port:3306,
        database:'test',
        username:'root',
        password:'',
        debug:false,
        showSql:false,
        pool:{
            connectionLimit:10,
            queueLimit:0,
            waitForConnections:true
        }
    },option);
    var schema = new Schema('mysql', option);
    return fastDBM(schema.adapter,option);
};
