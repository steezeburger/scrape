// REQUIRE
var nodeio      = require( 'node.io'          ),
    request     = require( 'request'          ),
    _           = require( 'underscore'       ),
    __          = console.log,
    mongoose    = require( 'mongoose'         ),
    schemas     = require( '../../app/schema' ),
    validator   = require( '../../lib/com/ganjazoid/ValidatorBase' );

// CONST
var DISPENSARY_CONTROLLER_COMPLETE  = 'dispensary.list.complete',
    DISPENSARY_CONTROLLER_ERROR     = 'dispensary.list.error',
    PAYLOAD_LOAD                    = 'Load',
    PAYLOAD_LOADED                  = 'Loaded',
    PAYLOAD_COMPLETE                = 'Complete';

// DYNAMIC
var DispensaryController,
    RegionModel, 
    RegionSchema, 
    SubregionSchema, 
    SubregionModel,
    DispensarySchema,
    DispensaryModel,
    db,
    scope,
    Validator       = validator.getInstance();
    payloads        = [],
    pageData        = [],
    l               = console.log;

DispensaryController = function() {
    var self = this;
};

DispensaryController.prototype = {
    constructor:  DispensaryController,
    callbacks: [],

    /* PROCEDURAL FUNCTIONS */

    init: function() {
        var self = this;

        self.payloadInit( 'regions' );
        self.payloadInit( 'dispensaries' );

        self.getSchemas().getModels().connect();
        return self;
    },

    start: function() {
        var self = this;
        self.getRecords();
        return self;
    },

    analysePage: function( $ ) {
        var self = this;
        // starting point
        var collection = $( '#dispensaries-list .dispensaries li' );
        if( collection ) {
            self.payloadTick( 'dispensaries', collection.length );
            /*self.setPayload( 'dispensaries', ( self.getPayload( 'dispensaries' ) + collection.length ) );*/
            return true;
        }
        return false;
    },

    requestPage: function( page ) {
        var self = this;
        console.log( '@ fetching page: ' + page );
        // send out requests to get pages, and process them afterward.

        // gets one of the regions
        scope.getHtml( page, function( err, $ ) {
            // we got page data, yay, its loaded, so tick it
            self.payloadItemTick( 'regions', 1 );
            // grab the object containing the HTML we need to parse. We need to crawl this data
            // first to find out what the payload is so we can cease processing when it's complete
            // not doing this will create race conditions since this is a non blocking IO 
            pageData.push( $ );
            // get the counts
            self.analysePage( $ );

            // if all tha pages are loaded, and analysed, lets move on to parsing
            if( self.payloadMet( 'regions' ) ) {
                // move along
                __( '@ regions and page processing complete. Ended up with this many: ', self.getPayloadItemsLoaded( 'regions' ) );
                __( '@ how many dispensaries?: ', self.getPayload( 'dispensaries' ) );
                __( '@ moving to store urls' );

                self.saveResults();
                
            }
        });
        return self;
    },

    processRecords: function( docs ) {
        var self = this;
        // make this as atomic as possible
        if( undefined === docs ) {
            // there needs to be some urls, or something went wrong, need to rerun previous controller
            self.dispatch( DISPENSARY_CONTROLLER_ERROR );
            return;
        }

        for( var i in docs ) {
            // concat url to request
            var page = self.urlScheme( docs[ i ].slug );
            
            // fetching page
            self.requestPage( page, i );
        }
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
            self.start();
        });
    },

    getSchemas: function() {
        var self = this;
        RegionSchema        = mongoose.Schema( schemas.get( 'stickyguide_region' ) );
        SubregionSchema     = mongoose.Schema( schemas.get( 'stickyguide_subregion' ) );
        DispensarySchema    = mongoose.Schema( schemas.get( 'stickyguide_dispensary' ) );
        return self;
    },

    getModels: function() {
        var self = this;
        RegionModel         = mongoose.model( 'stickyguide_region',     RegionSchema );
        SubregionModel      = mongoose.model( 'stickyguide_subregion',  SubregionSchema );
        DispensaryModel     = mongoose.model( 'stickyguide_dispensary', DispensarySchema );
        return self;
    },

    getRecords: function() {
        var self = this;
        RegionModel.find( { site: 'stickyguide.com' }, function( err, docs ) {
            console.log( '@ records results' );
            if( err ) {
                console.log( '@ERROR could not select records ', err  );
                self.dispatch( DISPENSARY_CONTROLLER_ERROR );
                return false;
            } else {
                // set how many pages we're expecting to process
                self.setPayload( 'regions', docs.length );
                self.processRecords( docs );
            }
        });
        return self;
    },

    saveResults: function() {
        //pageData
        var self = this,
            document;

        for( var i in pageData ) {

            var $ = pageData[ i ], 
                    collection = $( '#dispensaries-list .dispensaries li' );
            
            if( collection ) {
                var  z = 0;
                collection.each( function( node ) {

                    var info            = $( '.details .alt a', node ),
                        address_node    = $( '.details .location', node ),
                        meta            = $( '.details .text strong', node ),
                        url,
                        address,
                        title,
                        location,
                        lastUpdated,
                        meta;

                       z++;

                    // TODO: Validation: get dispensary meta data
                    url         = ( Validator.assert( 
                                        Validator.constants.IS_NOT_EMPTY, 
                                        info.attribs.href )) ? info.attribs.href : '';
                    title       = info.children[ 0 ].raw;
                    address     = address_node.children[ 0 ].raw;
                    lastUpdated = meta[ meta.length - 1 ].children[ 0 ].raw;

                    document = {
                        url:url,
                        title:title,
                        address:address,
                        location:location,
                        lastUpdated:lastUpdated
                    };

                    DispensaryModel.update(
                    { 
                        title: document.title, 
                        location: document.location 
                    }, // criteria
                    {
                        url: document.url,
                        title: document.title,
                        address: document.address,
                        location: document.location,
                        lastUpdated: new Date( document.lastUpdated )
                    }, // new data
                    {
                        upsert: true
                    }, // create new doc if not found
                    function( err, updatedCount ) {
                        if( err ) {
                            console.log( '@ERROR document not written', err );
                            // if a record wasn't written, deduct from the expected total by one
                            self.payloadTick( 'dispensaries', -1 );
                        } else {
                            if( updatedCount < 1  ) {
                                l( '@ERROR could not save record' );
                            }

                            self.payloadItemTick( 'dispensaries', 1 );
                            if( self.payloadMet( 'dispensaries' ) ) {
                                l( '@ expecting to find ', self.getPayload( 'dispensaries' ) );
                                DispensaryModel.find( { site: "stickyguide.com" }, function( err, docs ) {
                                    console.log( docs.lenth + ' in mongo', err );
                                    self.endProcess( '@@ process complete' );
                                });
                            }
                        }
                    });
                });
            } else {
                console.log( '@@ ERROR collection not found for page: ', pageData[ i ] );
                self.endProcess( '@@ process complete' );
            }
        }
    },

    /* UTILITY FUNCTIONS */

    payloadInit: function( nameOfPayload ) {
        var self = this        
        payloads[ nameOfPayload + PAYLOAD_LOAD      ] = 0;
        payloads[ nameOfPayload + PAYLOAD_LOADED    ] = 0;
        payloads[ nameOfPayload + PAYLOAD_COMPLETE  ] = false;
    },

    getPayload: function( which ) {
        var self = this;
        return payloads[ which + PAYLOAD_LOAD ];
    },

    getPayloadItemsLoaded: function( which ) {
        var self = this;
        return payloads[ which + PAYLOAD_LOADED ];
    },

    setPayload: function( which, value ) {
        var self = this;
        console.log( 'setPayload: ', 'which:', which, 'value: ', value );
        payloads[ which + PAYLOAD_LOAD ] = value;
        return;
    },

    payloadItemTick: function( which, value ) {
        var self = this;
        return payloads[ which + PAYLOAD_LOADED ] += value;
    },

    payloadTick: function( which, value ) {
        var self = this;
        return payloads[ which + PAYLOAD_LOAD ] += value;
    },

    payloadMet: function( which ) {
        var self = this, result;

        if ( payloads[ which + PAYLOAD_LOAD ] === payloads[ which + PAYLOAD_LOADED ] ) {
            console.log( '@ Payload met: ' + which );
            payloads[ which + PAYLOAD_COMPLETE ] = true;
            result = true;
        } else {
            result = false;
        }
        return result;
    },
    
    endProcess: function() {
        var self = this;
        self.dispatch( DISPENSARY_CONTROLLER_COMPLETE );
    },

    urlScheme: function( piece ) {
        var self = this;
        return 'https://www.stickyguide.com' + piece + '/dispensary-finder';
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
                    message: "Dispensary Controller: processing complete "
                });
            }
        }
    }

}

// RUNNER
exports.job = new nodeio.Job({
    timeout: 120,   // process life max
    retries: 3,     //
    max: 120        // threads max
},
{
    input: false,
    run: function() {
        var me    = this;
        scope     = this;
        var dispensaryController = new DispensaryController();
        dispensaryController.listen( DISPENSARY_CONTROLLER_COMPLETE, function( event ) {
            console.log( '## received process end with success' );
            me.emit( event.message );
        });
        dispensaryController.listen( DISPENSARY_CONTROLLER_ERROR, function( event ) {
            me.error( event.message );
        });
        try {
            dispensaryController.init();
        } catch( e ) {
            console.log( e );
            this.error( e );
        }
    }
});