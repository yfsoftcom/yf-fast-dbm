var _ = require('lodash');
var mysql = require('mysql');
var fastDBM = require('./fastDBM.js');

var defaultOption = {
    host:'localhost',
    port:3306,
    database:'test',
    user:'root',
    password:'',
    debug:false,
    showSql:false,
    connectionLimit:10,
    queueLimit:0,
    waitForConnections:true
};

module.exports = function(option){
  if(_.has(option,'pool')){
    option = _.extend(option,option.pool);
  }
  var _option = _.extend(defaultOption,option);
  var pool  = mysql.createPool(_option);
  return fastDBM(pool,_option);
};
