// REQUIRE
var nodeio      = require( 'node.io'    ),
    request     = require( 'request'    ),
    _           = require( 'underscore' ),
    mongoose    = require( 'mongoose'   ),
    site        = require( './schema/site' ),
    schemas     = require( './schema/regions' ),
    payloadManager = require( '../../lib/com/ganjazoid/PayloadManager' ),
    validator   = require( '../../lib/com/ganjazoid/ValidatorBase' );

// CONST
var SCRAPER_CONTROLLER_COMPLETE  = 'dispensary.list.complete',
    SCRAPER_CONTROLLER_ERROR     = 'dispensary.list.error',
    PAYLOAD_LOAD                    = 'Load',
    PAYLOAD_LOADED                  = 'Loaded',
    PAYLOAD_COMPLETE                = 'Complete';

// DYNAMIC
var ScrapeController,
    DispensarySchema,
    DispensaryModel,
    PriceSchema,
    PriceModel,
    db,
    scope,
    Validator       = validator.getInstance();
    payloads        = payloadManager.payload(),
    pageData        = [],
    l               = console.log;

ScrapeController = function() {
    var self = this;
    console.log( '@ Dispensary Scraper Loaded' );
};

ScrapeController.prototype = {
    constructor:  ScrapeController,
    callbacks: [],
    /* PROCEDURAL FUNCTIONS */

    init: function() {
        var self = this;

        payloads.init( 'dispensaries' );
        payloads.init( 'strains'      );

        console.log( '@ Scraper Controller: init' );
        self.getSchemas().getModels().connect();
        global.addToQueue( , function() {

        });

        return self;
    },

    /* DATA FUNCTIONS */

    connect : function() {
        var self = this;
        mongoose.connect('mongodb://localhost/ganjazoid');
        db = mongoose.connection;
        db.on( 'error', function() {
            console.log( 'connection error' );
        });
        db.once( 'open', function() {
            console.log( 'connection open' );
            return;
        });
    },

    getSchemas: function() {
        var self = this;
        DispensarySchema = mongoose.Schema( schemas.get( 'dispensary' ) );
        PriceSchema      = mongoose.Schema( schemas.get( 'price'     ) );
        return self;
    },

    getModels: function() {
        var self = this;
        DispensaryModel = mongoose.model( 'DispensaryData', DispensarySchema );
        PriceModel      = mongoose.model( 'Price',          PriceSchema      );
        return self;
    },

    getListings: function() {
        DispensaryModel.find( function( err, docs ) {
            for( var i in docs ) {
                Queue.add();
            }
        });
    },

    listen: function( event, callback ) {
        var self = this;
        self.callbacks.push({ event: event, callback: callback});
    },

    dispatch: function( event ) {
        var self = this;
        for( var i in self.callbacks ) {
            if( event === self.callbacks[ i ].event ) {
                self.callbacks[ i ].callback({
                    message: "Scraper Controller: processing complete "
                });
            }
        }
    }
}

// RUNNER
exports.job = new nodeio.Job({
    timeout: 240,   // process life max
    retries: 3,     //
    max: 120        // threads max
},
{
    input: false,
    run: function() {
        var me    = this;
        scope     = this;
        var scrapeController = new ScrapeController();
       
        scrapeController.listen( SCRAPER_CONTROLLER_COMPLETE, function( event ) {
            console.log( '## received process end with success' );
            me.emit( event.message );
        });
        scrapeController.listen( SCRAPER_CONTROLLER_ERROR, function( event ) {
            me.error( event.message );
        });

        try {
            scrapeController.init();
        } catch( e ) {
            console.log( e );
            this.error( e );
        }
    }
});