    // DEPENDENCIES
var nodeio      = require( 'node.io'            ),
    request     = require( 'request'            ),
    _           = require( 'underscore'         ),
    mongoose    = require( 'mongoose'           ),
    site        = require( './schema/site'      ),
    schemas     = require( './schema/regions'   ),
    helpers     = require( '../../lib/com/ganjazoid/Helpers'),
    config      = require( '../../app/configs' ),
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
    Validator       = validator.getInstance(),
    //payloads        = payloadManager.payload(),
    originalData    = null,
    pageURLs        = [],
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

        //payloads.init( 'dispensaries' );
        //payloads.init( 'strains'      );

        console.log( '@ Scraper Controller: init' );
        self.listen( CONNECTED_SUCCESS, function() {
            self.enQueue();
        });
        
        self.getSchemas()
            .getModels()
            .connect();

        return self;
    },

    /* DATA FUNCTIONS */

    connect : function() {
        var self = this;
        mongoose.connect( config.setting( 'databaseURL' ) );
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
        DispensaryModel.find(function( err, result ) {
            if( result === 0 ) {
                self.endProcess( 'no documents found, cannot procceed' );
                return;
            } else {
                cur             = 0;
                limit           = 1 // result.length;
                originalData    = result;
                temp            = [];
                pageURLs.push( self.formatURL( '/dispensaries/natural-herbal-pain-relief', true ) );
                /*for( var i in result ) {
                    pageURLs.push( result[ i ].url );
                }*/
                self.getListing();
            }
        });
    },

    getListing: function( overrideURL ) {
        var self            = this,
            url             = ( overrideURL ) ? overrideURL : null,
            hasPagination   = false;

        if( cur < limit ) { // still processing to be done
            // this is a recursive call that will keep going until finished. This is a blocking IO technique
            // because we don't want to hammer the shit out of the slow sites at first. We can open up on them 
            // later. As long as it's scraped at night, once a day, I think thats adequate for now
            // note: for some reason the server returns a 200 on a redirect, thats why this is so jank and we skip a page 
            // when node isn't present instead of server code.
            // url =  ""; 
            // self.formatURL( doc[0].url );

            console.log( 'fetching: ', url );
            // get the page
            scope.getHtml( ( url ) ? url : pageURLs[ cur ], function( err, $ ) {

                // if not, proceed to parse the page
                var menuRows,
                    documentCollection,
                    hasRows = false,
                    items = [];

                try {
                    menuRows    = $( '.flower-snippet .flower-details' );
                    hasRows     = true;
                    // tick up payload
                } catch( e ) {
                    console.log( 'no menu for dispensary' );
                    limit--;
                }

                // we have a menu
                if( hasRows ) {
                    // once we have the html we need to see if there is pagination
                    var nextPage;
                    try {
                        nextPage        = $( '.pagination a' );
                        hasPagination   = true;
                        // it has it
                    } catch( e ) {}

                    // we need to request all subsequent pages, and add to the expected payload
                    if( hasPagination ) {
                        // need to grab the pagination only once, so lets make sure any pages are 
                        for( var x = 0; x < nextPage.length; x++ ) {
                            var href = self.formatURL( nextPage[ x ].attribs.href , true, false );
                            // only inject if it's not there aleady
                            if( -1 === pageURLs.indexOf( href ) &&  // if it's not in the list already 
                                -1 === href.indexOf( 'page=1' )) { // and it's not the first page in the pagination (since we hit the first page first, this is never relevant)
                                pageURLs.splice( cur + 1, 0, href );
                                limit++;
                            }
                        }
                    }

                    if( !nextPage[ 0 ].class ) { // they add a class to the "next" pagination, we only want to numeric onces
                        console.log( nextPage[ 0 ].attribs.href );
                    }
                    self.processListing( menuRows, $ );
                }
                cur++;
                // recursivelt till its done
                self.getListing();
            });
        } else {
            l( 'process complete', pageURLs );
            //self.endProcess( 'parsing complete' );
        }

    },

    processListing: function( menuRows, $, listingType ) {
        var self = this;
        if( undefined === menuRows ) {
            return false;
        }

        if( undefined === listingType ) {
            listingType = 'flower';
        }

        switch( listingType ) {
            case "flower":
                for( var i = 0; i < menuRows.length; i++ ) {
                    //console.log( 'processing column ' + i );

                    // get nodes
                    var nodeGroup       = {};
                    nodeGroup.titleNode = $( 'h5 a',   menuRows[ i ] );
                    nodeGroup.stats     = $( '.stats .stat', menuRows[ i ] );
                    
                    // parse data
                    PriceModel.title          = nodeGroup.titleNode.children[ 0 ].raw;
                    PriceModel.url            = nodeGroup.titleNode.attribs.href;
                    PriceModel.meta           = [],
                    PriceModel.type           = listingType,
                    PriceModel.createdAt      = new Date();
                    PriceModel.prices         = [];

                    for( var z = 0; z < nodeGroup.stats.length; z++ ) {
                        var value = nodeGroup.stats[ z ].children[ 0 ].children[ 0 ],
                            key   = nodeGroup.stats[ z ].children[ 1 ].children[ 0 ];
                        // this is the price section
                        if( value.raw.indexOf( 'span class' ) > -1 ) {
                            var prices = {};
                            prices.currency = ( value.children[ 0 ].raw === "$" )  ? 'US' : value.children[ 0 ].raw;
                            prices.unit = helpers.trim( nodeGroup.stats[ z ].children[ 1 ].children[ 0 ].raw );
                            prices.price = helpers.trim( nodeGroup.stats[ z ].children[ 0 ].children[ 1 ].raw );
                            PriceModel.prices.push( prices );
                        // this is the meta data section
                        } else {
                            PriceModel.meta.push({
                                key:    helpers.trim( key.raw ),
                                value:  helpers.trim( value.raw )
                            });

                        }
                    }
                    self.save( PriceModel );
                }
            break;
        }
        return true;
    },

    save: function( data ) {
        var self = this;
        if( undefined === data ) {
            return false;
        }
        PriceModel.create( data, function( err, document, count ) {
            if( err ) {
                console.log( 'error: ', err )
            }
            //console.log( 'record saved ' );
        });
    },

    /* UTILS */

    formatURL: function( slug, absolutePath, addTail ) {
        var url = '',
            tail = ( false === addTail ) ? '' : '/menu.html?type_name=Flowers';
        if( true === absolutePath ) {
            url += config.setting('stickyguide');
        }
        return url + slug + tail;
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