var Q = require('q');
var _ = require('underscore');
var async = require('async');
var E = {
    TABLE_REQUIRED:{errno:-910,code:'TABLE_REQUIRED',message:"table required!"},
    SQL_INJECTION:{errno:-906,code:'SQL_INJECTION',message:"you have sql keyword! ex:['drop ','delete ','truncate ',';','insert ','update ','set ','use ']"},
    UPDATE_ERROR:{errno:-5,code:'UPDATE_ERROR',message:'Nothing changed!'},
    OBJECT_ID_NOT_FIND:{errno:-4,code:'OBJECT_ID_NOT_FIND',message:'Object does not find by id or more rows'},
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
    condition  = '('+condition+') and delflag = 0';

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
    console.log(sql);
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
        adapter.query(sql,function(err,res){
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
    return deferred.promise;
}


module.exports = function(adapter) {
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
            async.parallel([
                //1执行统计
                function(callback){
                    count(args).then(function(data){
                        callback(null,data);
                    }).catch(function(err){
                        callback(err);
                    });
                },
                //2执行查询
                function(callback){
                    find(args).then(function(data){
                        callback(null,data);
                    }).catch(function(err){
                        callback(err);
                    });
                },
            ],function(err,result){
                if(err){
                    deferred.reject(err);
                }else{
                    deferred.resolve({count:result[0],rows:result[1]});
                }
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