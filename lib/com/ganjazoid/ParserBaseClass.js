var mongoose    = require( 'mongoose' ),
    _           = require( 'underscore' ),
    schemaGroup = require( '../../../app/schema' ),
    config      = require( '../../../app/configs' );

var Parser =  {
    privateOptions : {},
    mongoose       : mongoose,
    config         : config,
    callbacks      : [],
    initializer    : null,
    schemas        : [],
    models         : [],
    db             : null,
    constants: {
        COMPLETE: 'complete',
        CONNECTED_SUCCESS: 'connect_success',
        PROCESSS_COMPLETE: 'process.complete'
    },
    init: function( collections, callback, arguments ) {
        var self = this;
        console.log( 'connecting' );
        if( undefined !== callback ) {
            initializer = { fires: callback, takes: arguments };
        }
        self.getSchemas( collections ).getModels().connect();
        return true;
    },
    endProcess: function( msg ) {
        var self = this;
        if( undefined !== msg ) {
            console.log( 'ending process with message: ', msg );
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
            console.log( 'connection error' );
        });
        self.db.once( 'open', function() {
            console.log( 'connection open' );
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
        console.log( 'get Schemas', schemaNames );
        _.each( schemaNames, function( element, index, schemaNames ) {
            var schema = schemaGroup.get( schemaNames[ index ] );
            console.log( 'found schema', schema );
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
            console.log( ' --- setting model', element.name );
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