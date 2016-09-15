var _ = require('lodash');
var fastMysql = require('./lib/fastMysql.js');
module.exports = function(option){
    var _option = _.extend({type:'mysql',user:option.username || 'root'},option);
    if(_option.type === 'mysql'){
      return fastMysql(_option);
    }
    //TODO:add other db types
    return fastMysql(_option);
};
