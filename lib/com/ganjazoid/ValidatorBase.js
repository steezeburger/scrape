var Validator = {
    // returns true / false
    constants: {
        IS_NOT_EMPTY:   'isNotEmpty',
        IS_EMPTY:       'isEmpty'   ,
        IS_NUMBER:      'isNumber'  ,
        IS_ALPHA:       'isAlpha'   ,
        IS_EQUAL:       'isEqual'   ,
        IS_NOT_EQUAL:   'isNotEqual',
        MATCHES:        'isMatch'
    },
    assert: function( type ) {
        switch( type ) {
            case this.constants.IS_NOT_EMPTY:
                return  ( arguments[ 1 ] != ''         && 
                          arguments[ 1 ] != undefined  && 
                          arguments[ 1 ] != null  ) ? true : false;
            break;
        }
    }
}

exports.getInstance = function() {
    return Validator;
};