var mongoose    = require( 'mongoose' ),
    _           = require( 'underscore' ),
    __          = console.log,
    schemaGroup = require( '../../../app/schema' ),
    config      = require( '../../../app/configs' );

var Parser =  {
    privateOptions : {},
    moduleScope    : this,
    mongoose       : mongoose,
    config         : config,
    callbacks      : [],
    initializer    : null,
    schemas        : [],
    models         : [],
    db             : null,
    loader         : function() {
        // closure variables
        var _self = this;
        var _cur = function( which ) {
            var self = _self;
            return self[ which ].completed;
        }
        var _total = function( which ) {
            var self = _self;
            return self[ which ].expecting;
        };
        var _met   = function( which ) {
          var self = _self;
          return self[ which ].completed === self[ which ].expecting;
        };
        var _init = function( which, initVal, initMax ) {
          var self = _self;
          if( undefined === self[ which ] ) {
            self[ which ] = [];
          }
          self[ which ].completed = ( parseInt( initVal ) ) ? initVal : 0,
          self[ which ].expecting = ( parseInt( initMax ) ) ? initMax : 0;

          if( self[ which ].completed > self[ which ].expecting ) {
            __( 'completed exceeds payload, not setting'.red );
            self[ which ].completed = 0,
            self[ which ].expecting = 0;
            return false;
          }
          return true;
        };
        var _tick = function( which, value ) {
          var self = _self;
          if( undefined !== value ) {
            self[ which ].completed += value;
          } else {
            self[ which ].completed++;
          }
          return;
        };
        var _set = function( which, value ) {
          var self = _self;
          self[ which ].expecting = value;
          return;
        };
        // global accessors
        _self.met          = _met;
        _self.total        = _total;
        _self.init         = _init;
        _self.tick         = _tick;
        _self.set          = _set;
        _self.cur          = _cur;
    },
    constants: {
        COMPLETE:           'complete',
        CONNECTED_SUCCESS:  'connect_success',
        PROCESS_COMPLETE:   'process.complete'
    },
    init: function( collections, callback, arguments ) {
        var self = this;

        if( undefined !== callback ) {
            initializer = { fires: callback, takes: arguments };
        }
        self.getSchemas( collections ).getModels().connect();
        return true;
    },
    endProcess: function( msg ) {
        var self = this;
        if( undefined !== msg ) {
            __( 'ending process with message: ', msg );
        }
        self.dispatch( self.constants.COMPLETE );
    },
    listen: function( event, callback ) {
        var self = this;
        self.callbacks.push({ event: event, callback: callback});
    },
    dispatch: function( event, extra ) {
        var self = this;
        for( var i in self.callbacks ) {
            if( event === self.callbacks[ i ].event ) {
                var message = {};
                if( extra ) {
                    message = {
                        message: extra.message,
                        data: extra.data
                    }
                }
                self.callbacks[ i ].callback( message );
            }
        }
    },
    connect : function() {
        var self = this;
        self.mongoose.connect( self.config.setting( 'databaseURL' ) );
        self.db = self.mongoose.connection;
        self.db.on( 'error', function() {
            __( 'connection error' );
        });
        self.db.once( 'open', function() {
            __( 'connection open' );
            self.dispatch( self.constants.CONNECTED_SUCCESS, {
                message: "database connected",
                data: null
            });
            if( initializer ) {
                console.log( 'fired initializer' );
                self[ initializer.fires ]( initializer.takes );
            }
            return;
        });
    },
    getSchemas: function( schemaNames ) {
        var self = this;
        __( 'get Schemas', schemaNames );
        _.each( schemaNames, function( element, index, schemaNames ) {
            var schema = schemaGroup.get( schemaNames[ index ] );
            __( 'found schema', schema );
            self.schemas.push({
                name: schemaNames[ index ],
                schema: mongoose.Schema( schema )
            });
        });
        return self;
    },
    getModel: function ( name ) {
        var self = this;
        return _.where( self.models, { name : name } )[ 0 ].model || false;
    },
    getModels: function() {
        var self = this;
        _.each( self.schemas, function( element, index, schemas ) {
            __( ' --- setting model', element.name );
            var model = mongoose.model( element.name, element.schema );
            self.models.push({
                name: element.name,
                model: model
            });
        });
        return self;
    }
};

exports.create = function( options ) {
    return Parser;
};