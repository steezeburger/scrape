// REQUIRE
var nodeio      = require( 'node.io'            ),
    request     = require( 'request'            ),
    _           = require( 'underscore'         ),
    mongoose    = require( 'mongoose'           ),
    site        = require( './schema/site'      ),
    schemas     = require( './schema/regions'   ),
    payloadManager  = require( '../../lib/com/ganjazoid/PayloadManager' ),
    validator       = require( '../../lib/com/ganjazoid/ValidatorBase'  );

// CONST
var SCRAPER_CONTROLLER_COMPLETE  = 'dispensary.list.complete',
    SCRAPER_CONTROLLER_ERROR     = 'dispensary.list.error',
    CONNECTED_SUCCESS               = 'DatabaseConnected';
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
    cur             = 0,
    limit           = 0,
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
        self.listen( CONNECTED_SUCCESS, function() {
            self.enQueue();
        });
        
        self.getSchemas().getModels().connect();
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
            self.dispatch( CONNECTED_SUCCESS, {
                message: "database connected",
                data: null
            });
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

    enQueue: function() {
        var self = this;
        DispensaryModel.find({}).count(function( err, result ) {
            if( result === 0 ) {
                self.endProcess( 'no documents found, cannot procceed' );
                return;
            } else {
                //limit = result;
                limit = 1;
                self.getListing();
            }
        });
    },

    getListing: function() {
        var self = this;
        console.log( 'payload', cur, limit );
        if( cur < limit ) { // still processing to be done
            // this is a recursive call that will keep going until finished. This is a blocking IO technique
            // because we don't want to hammer the shit out of the slow sites at first. We can open up on them 
            // later. As long as it's scraped at night, once a day, I think thats adequate for now
            DispensaryModel.find({}, null, { skip: cur }).limit(1).exec(function( err, doc ) {
                var url =  "https://www.stickyguide.com/dispensaries/natural-herbal-pain-relief/menu.html?type_name=Flowers"; // self.formatURL( doc[0].url );

                if( err ) {
                    console.log( err );
                }
                console.log( 'fetching: ', url );
                // try to get the menu
                scope.getHtml( url, function( err, $ ) {
                    var menuRows,
                        documentCollection,
                        items = [];

                    try {
                        menuRows = $( '.flower-details' );
                        for(var i = 0; i < menuRows.length; i++) {
                            console.log( 'found flower power ' + i );
                        }
                        // tick up payload
                    } catch( e ) {
                        console.log( 'no menu for dispensary' );
                        limit--;
                    }
                    cur++;
                    self.getListing();
                    //self.endProcess( 'lets just do 1' );
                });
            });
        } else {
            self.endProcess( 'parsing complete' );
        }

    },

    /* UTILS */

    formatURL: function( slug ) {
        return "https://www.stickyguide.com"+slug+"/menu.html?type_name=Flowers";
    },

    endProcess: function() {
        var self = this;
        self.dispatch( SCRAPER_CONTROLLER_COMPLETE );
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