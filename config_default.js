module.exports = {
    host:'localhost',           //mysql host
    port:3306,                  //mysql port
    database:'test',            //mysql dbname
    user:'root',            //mysql username
    password:'',                //mysql password
    debug:false,                //true：输出jugglingdb生成的sql语句
    showSql:false,              //true：输出本模块生成的sql语句
    pool:{
        connectionLimit:10,     //链接池的配置
        queueLimit:0,
        waitForConnections:true
    }
};
