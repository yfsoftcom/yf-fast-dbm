module.exports = {
    CONNECT_ERROR:{errno:-920,code:'CONNECT_ERROR',message:'cant connect the db server~'},
    TABLE_REQUIRED:{errno:-910,code:'TABLE_REQUIRED',message:"table required!"},
    SQL_INJECTION:{errno:-906,code:'SQL_INJECTION',message:"you have sql keyword! ex:['drop ','delete ','truncate ',';','insert ','update ','set ','use ']"},
    UPDATE_ERROR:{errno:-5,code:'UPDATE_ERROR',message:'Nothing changed!'},
    OBJECT_ID_NOT_FIND:{errno:-4,code:'OBJECT_ID_NOT_FIND',message:'Object does not find by id or more rows'},
};
