var Q = require('q');
var _ = require('lodash');
var async = require('async');
var E = require('../error.js');

var _options = {
  showSql : true
};

function parseSort(sort){
    return  sort.replace('-',' desc').replace('+',' asc');
}

function parseRows(row){
    if(_.isArray(row)){
        //多条数据
        var valArr = [];
        var field = '';
        for(var r in row){
            //单个数据
            var keys = [];
            var vals = [];
            for(var k in row[r]){
                keys.push(k);
                var val = row[r][k];
                vals.push((typeof(val) == 'string')?'\''+ val+'\'':val);
            }
            field = keys.join(',');
            var values = vals.join(',');
            valArr.push('('+values+')');
        }
        var valueData = valArr.join(',');
        return  '(' + field +') values '+ valueData;
    }else{
        //单个数据
        var keys = [];
        var vals = [];
        for(var k in row){
            keys.push(k);
            var val = row[k];
            vals.push((typeof(val) == 'string')?'\''+ val+'\'':val);
        }
        var fields = keys.join(',');
        var values = vals.join(',');
        return  '(' + fields +') values ('+ values + ')';
    }

}

//可能会注入的关键字
var keyWords = ['drop ','delete ','truncate ',';','insert ','update ','set ','use '];
/**
 * 排除注入的脚本信息
 * @param src
 */
function exceptInjection(src){
    //无意义的数据，直接返回
    if(!src){
        return false;
    }
    //将数据转换成 String 类型
    if(_.isObject(src)){
        src = JSON.stringify(src);
    }else if(_.isArray(src)){
        //TODO:需要将数组中的数据进行字符串化
        src = src.join(',');
    }else if(_.isNumber(src)){
        src = ''+src;
    }
    for(var i in keyWords){
        var k = keyWords[i];
        if(src.toLowerCase().indexOf(k)>-1){
            return true;
        };
    }
    return false;
}

function getValue(val){
  //如果是string类型添加单引号
  if(_.isString(val)){
    return "'" + val + "'";
  }
  return val;
}
/**
[
['city','=','010'],
['and',['logintime','>',144334343]],
['or',['nickname','like','%xxx%']],
]
*/
function parseCondition(where){
  if(_.isEmpty(where)){
    return ' 1 = 1 ';
  }
  if(_.isString(where)){
    return where;
  }
  if(_.isArray(where)){
    var _condition = ' 1 = 1 ';
    var _keywords = ['and','or'];
    var _key,_operater,_value,_logic;
    _.each(where,function(item){
      if(_.isString(item)){
        _condition = _condition + ' and ' + item;
      }else if(_.isArray(item)){
        var _key = item[0];
        if(_.includes(_keywords,_key)){
          //正常的条件语句，通过and进行拼接
          _logic = item[0];
          _key = item[1][0];
          _operater = item[1][1];
          _value = item[1][2];
        }else{
          //正常的条件语句，通过and进行拼接
          _operater = item[1];
          _value = item[2];
          _logic = 'and'
        }
        _logic = ' ' + _logic + ' ';
        _condition = _condition + _logic + _key + _operater + getValue(_value);
      }
    });
    return _condition;
  }
}

//执行原生的查询sql
function parseSql(action,args){
    var sql = "";
    var table = args.table || '';
    var condition = args.condition || ' 1 = 1 ';
    var field_column = args.fields||' * ';
    if(exceptInjection(table)
        || exceptInjection(condition)
        || exceptInjection(field_column)
        || exceptInjection(args.limit)
        || exceptInjection(args.skip)
        || exceptInjection(args.sort)
        || exceptInjection(args.id)
        || exceptInjection(args.row)
    ){
        return false;
    }

    //condition链接上假删除的筛选条件
    condition  = '('+ parseCondition(condition) +') and delflag = 0';

    switch(action){
        case "count":
            sql = "select count(*) as c from " + table + ' where '+ condition;
            break;
        case "select":
            var limit = parseInt(args.limit || 10);
            var skip = parseInt(args.skip || 0);
            var sort = parseSort(args.sort || 'id- ');
            sql = 'select '+ field_column +' from ' + table + ' where ' + condition + ' order by ' + sort  + ' limit '+ skip + ',' + (limit);
            break;
        case "first":
            var skip = parseInt(args.skip || 0);
            var sort = parseSort(args.sort || 'id- ');
            sql = 'select '+ field_column +' from ' + table + ' where ' + condition + ' order by ' + sort  + ' limit '+ skip + ',' + (1);
            break;
        case "get":
            sql = 'select '+ field_column +' from ' + table + ' where delflag = 0 and id = ' + args.id;
            break;
        case "remove":
            //替换成假删除
            sql = "update " + table + ' set delflag = 1 , updateAt = '+ _.now() +' where delflag = 0 and id = ' + args.id ;
            // 放弃删除语句
            // sql = 'delete from ' + table + ' where id = ' + args.id;
            break;
        case "clear":
            //替换成假删除
            sql = "update " + table + ' set delflag = 1 , updateAt = '+ _.now() +' where ' + condition;
            // 放弃删除语句
            //sql = 'delete from ' + table + ' where ' + condition;
            break;
        case "insert":
            var row = args.row;
            sql = 'insert into ' + table + parseRows(row);
            break;
        case "update":
            var row = args.row;
            var arr = [];
            for(var k in row){
                var val = row[k];
                arr.push(k + '=' + ((typeof(val) == 'string')?'\''+ val+'\'':val));
            }
            var modify = arr.join(',');
            sql = "update " + table + ' set ' + modify + ' where ' + condition ;
            break;
    }
    if(_options.showSql){
      console.log('The Last SQL:\n' + sql);
    }
    return sql;
}

function executeSql(adapter,action,args,cb){
    var deferred = Q.defer();
    //查询的表未设置
    if(!args.table){
        deferred.reject(E.TABLE_REQUIRED);
        return deferred.promise;
    }
    var sql = parseSql(action,args);
    if(sql === false){
        //存在sql注入
        deferred.reject(E.SQL_INJECTION);
    }else{
      adapter.getConnection(function(err, connection) {
        if(err){
          console.log(err);
          deferred.reject(E.CONNECT_ERROR);
        }else{
          connection.query( sql, function(err, res) {
            connection.release();
            if(err){
                deferred.reject(err);
            }else{
                //message字段没有什么意义
                if(_.has(res,'message')){
                    delete res.message;
                }
                if(cb){
                    res = cb(res);
                }
                deferred.resolve(res);
            }
          });
        }
      });
    }
    return deferred.promise;
}


module.exports = function(adapter,options) {
  _options = _.extend(_options,options) ;
    var count = function (args) {
        return executeSql(adapter,'count', args,function(data){
            return data[0]['c'];
        });
    };
    var find = function (args) {
        return executeSql(adapter,'select', args);
    };
    return {
        adapter:adapter,
        //查询列表
        find:find,
        count:count,
        //查询列表并且返回整体的数据条数
        findAndCount:function (args) {
            var deferred = Q.defer();
            count(args).then(function(c){
              find(args).then(function(data){
                  deferred.resolve({count:c,rows:data});
              }).catch(function(err){
                  deferred.reject(err);
              });
            }).catch(function(err){
                deferred.reject(err);
            });
            return deferred.promise;
        } ,
        //查询符合条件的首个记录
        first:function (args) {
            return executeSql(adapter,'first', args, function (list) {
                if (list.length >= 1) {
                    return list[0];
                }
                return {};
            });
        },
        create:function (args) {
            return executeSql(adapter,'insert', args,function(newRow){
                newRow.id = newRow.insertId;
                return newRow;
            });
        },
        //更新数据
        update:function (args) {
            var deferred = Q.defer();
            executeSql(adapter,'update', args).then(function(data){
                if(data.affectedRows < 1){
                    //未更新到任何数据,抛出异常
                    deferred.reject(E.UPDATE_ERROR);
                }else{
                    deferred.resolve(data);
                }
            }).catch(function(e){
                deferred.reject(e);
            });
            return deferred.promise;
        },
        //通过id获取唯一的数据
        get:function (args) {
            var deferred = Q.defer();
            executeSql(adapter,'get', args, function (list) {
                if (list.length === 1) {
                    deferred.resolve(list[0]);
                }else{
                    //未找到数据或者找到了多条数据
                    deferred.reject(E.OBJECT_ID_NOT_FIND);
                }
            });
            return deferred.promise;
        } ,
        //通过id删除符合条件的一条记录
        remove:function (args) {
            return executeSql(adapter,'remove', args);
        } ,
        //删除若干数据
        clear:function (args) {
            return executeSql(adapter,'clear', args);
        }
    };
};
