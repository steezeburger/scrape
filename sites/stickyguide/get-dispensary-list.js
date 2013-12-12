// REQUIRE
var nodeio      = require( 'node.io'    ),
    request     = require( 'request'    ),
    _           = require( 'underscore' ),
    mongoose    = require( 'mongoose'   ),
    site        = require( './schema/site' ),
    schemas     = require( './schema/regions' );

// CONST
var DISPENSARY_CONTROLLER_COMPLETE  = 'dispensary.list.complete',
    DISPENSARY_CONTROLLER_ERROR     = 'dispensary.list.error';

// DYNAMIC
var DispensaryController,
    RegionModel, 
    RegionSchema, 
    SubregionSchema, 
    SubregionModel,
    DispensarySchema,
    DispensaryModel,
    db, 
    globalPayload   = 0,
    globalPageCount = 0,
    payload         = [],
    count           = [];

DispensaryController = function() {
    var self = this;
    console.log( '@ Dispensary Scraper Loaded' );
};

DispensaryController.prototype = {
    constructor:  DispensaryController,
    callbacks: [],
    init: function() {
        var self = this;
        console.log( '@ Dispensary Controller: init' );
        self.getSchemas().getModels().connect();
        return self;
    },
    start: function() {
        var self = this;
        self.scrape();
        return self;
    },
    scrape: function() {
        var self = this;
        self.getRecords();
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
                self.processRecords( docs );
            }
        });
        return self;
    },
    saveResult: function() {
        DispensaryModel.update(
            { title: title, location: location }, // criteria
            { 
                url: url,
                title: title,
                address: address,
                location: location,
                lastUpdated: new Date( lastUpdated )
            }, // new data
            { upsert: true }, // create new doc if not found
            function( err, updatedCount ) {
                // uptick payload
                count[ docs[ i ].slug ]++;  // <----- !!!!!!!!NEED TO DO THIS IN A CLOSURE!!!!!!! 
                console.log( 'document written, checking for end condition', count, payload );

                // check for end condition
                if( count[ docs[ i ].slug ] === payload[ docs[ i ].slug ] ) {
                    console.log( 'dispensary list for page ' + docs[ i ].slug + 'collected and stored' );
                    globalPageCount++;
                    if( globalPayload === globalPageCount ) {
                        that.emit( 'process complete' );
                    }
                }
            }
        );
        return self;
    },
    processPage: function( page ) {
        var self = this;
        console.log( '@ fetching page: ' + page );
        that.getHtml( page, function( err, $ ) {
            // starting point
            var collection = $( '#dispensaries-list .dispensaries li' );

            // there is a subregion to crawl
            if( collection ) {
                
                console.log( '@ list node found' );
                
                // add to overall count 
                if( !payload[ docs[ i ].slug ] ) {
                    payload[ docs[ i ].slug ] = collection.length;
                }

                // iterate over all nodes to grab data
                collection.each( function( node ) {
                    var info            = $( '.details .alt a', node ),
                        address_node    = $( '.details .location', node ),
                        meta            = $( '.details .text strong', node ),
                        location_node   = $( '.details .neighborhood strong', node ),
                        url,
                        address,
                        title,
                        location,
                        lastUpdated,
                        meta;

                    // get dispensary meta data
                    url         = info.attribs.href;
                    title       = info.children[ 0 ].raw;
                    address     = address_node.children[ 0 ].raw;
                    location    = location_node.raw;
                    lastUpdated = meta[ meta.length - 1 ].children[ 0 ].raw;
                    
                    self.saveResult( 
                        url,
                        title,
                        address,
                        location,
                        lastUpdated
                    );

                });
            } else {
                // there are no subregions to crawl
                console.log( '@ERROR list construct not found, need to take other actions' );
                self.dispatch( DISPENSARY_CONTROLLER_ERROR );
                return false;
            }
        });
        return self;
    },
    processRecords: function( docs ) {
        var self = this;
        // make this as atomic as possible
        if( undefined === docs ) {
            // there needs to be some urls, or something went wrong
            self.dispatch( DISPENSARY_CONTROLLER_ERROR );
            return;
        }
        for( var i in docs ) {
            // concat url to request
            var page = self.urlScheme( docs[ i ].slug );
            
            // fetching page
            self.processPage( page );
        }
    },
    getSchemas: function() {
        var self = this;
        RegionSchema        = mongoose.Schema( schemas.get( 'region' ) );
        SubregionSchema     = mongoose.Schema( schemas.get( 'subregion' ) );
        DispensarySchema    = mongoose.Schema( schemas.get( 'dispensary' ) );
        return self;
    },
    getModels: function() {
        var self = this;
        RegionModel         = mongoose.model( 'RegionData', RegionSchema );
        SubregionModel      = mongoose.model( 'SubregionData', SubregionSchema );
        DispensaryModel     = mongoose.model( 'DispensaryData', DispensarySchema );
        return self;
    },
    endProcess: function() {
        var self = this;
        self.dispatch( DISPENSARY_CONTROLLER_COMPLETE );
    },
    urlScheme: function( piece ) {
        var self = this;
        return 'https://www.stickyguide.com' + piece + '/dispensary-finder';
    },
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
        var that = this;
        var dispensaryController = new DispensaryController();
        dispensaryController.listen( DISPENSARY_CONTROLLER_COMPLETE, function( event ) {
            that.emit( event.message );
        });
        dispensaryController.listen( DISPENSARY_CONTROLLER_ERROR, function( event ) {
            that.error( event.message );
        });
        dispensaryController.init();
    }
});






/*exports.job = new nodeio.Job({
    timeout: 120,
    retries: 3,
    max: 120
},
{
    input: false,
    run: function() {
        var that = this;
        var urlScheme = function( piece ) {
            return 'https://www.stickyguide.com' + piece + '/dispensary-finder';
        }
        // init database
        mongoose.connect('mongodb://localhost/ganjazoid');
        db = mongoose.connection;
        db.on( 'error', function() {
            console.log( 'connection error' );
        });
        db.once( 'open', function() {
            console.log( 'connection open' );
            // get region model

            RegionSchema        = mongoose.Schema( schemas.get( 'region' ) );
            SubregionSchema     = mongoose.Schema( schemas.get( 'subregion' ) );
            DispensarySchema    = mongoose.Schema( schemas.get( 'dispensary' ) );

            RegionModel         = mongoose.model( 'RegionData', RegionSchema );
            SubregionModel      = mongoose.model( 'SubregionData', SubregionSchema );
            DispensaryModel     = mongoose.model( 'DispensaryData', DispensarySchema );
            
            // try to find records in database to update
            RegionModel.find( { site: 'stickyguide.com' }, function( err, docs ) {
                console.log( 'records results' );
                if( err ) {
                    console.log( '###!! could not select records ' + err  );
                } else {
                    console.log( 'received records, processing' );
                    
                    // store overal page payload to be tracked
                    globalPayload = docs.length;

                    // iterate through records to update dispensary data
                    for( var i in docs ) {
                        
                        var page = urlScheme( docs[ i ].slug );
                        console.log( 'fetching page: ' + page );
                        that.getHtml( page, function( err, $ ) {
                            var collection = $( '#dispensaries-list .dispensaries li' );
                            // there is a subregion to crawl
                            if( collection ) {
                                
                                console.log( 'list construct found' );
                                
                                // add to overall count 
                                if( !payload[ docs[ i ].slug ] ) {
                                    payload[ docs[ i ].slug ] = collection.length;
                                }

                                // iterate over all nodes to grab data
                                collection.each( function( node ) {
                                    var info            = $( '.details .alt a', node ),
                                        address_node    = $( '.details .location', node ),
                                        meta            = $( '.details .text strong', node ),
                                        location_node   = $( '.details .neighborhood strong', node ),
                                        url,
                                        address,
                                        title,
                                        location,
                                        lastUpdated,
                                        meta;

                                    // get dispensary url
                                    url         = info.attribs.href;

                                    // get dispensary title
                                    title       = info.children[ 0 ].raw;

                                    // dispensary address
                                    address     = address_node.children[ 0 ].raw;

                                    // dispensary location
                                    location    = location_node.raw;

                                    // get dispensary meta
                                    lastUpdated = meta[ meta.length - 1 ].children[ 0 ].raw;
                                    
                                    DispensaryModel.update(
                                        { title: title, location: location }, // criteria
                                        { 
                                            url: url,
                                            title: title,
                                            address: address,
                                            location: location,
                                            lastUpdated: new Date( lastUpdated )
                                        }, // new data
                                        { upsert: true }, // create new doc if not found
                                        function( err, updatedCount ) {
                                            // uptick payload
                                            count[ docs[ i ].slug ]++;  // <----- !!!!!!!!NEED TO DO THIS IN A CLOSURE!!!!!!! 
                                            console.log( 'document written, checking for end condition', count, payload );

                                            // check for end condition
                                            if( count[ docs[ i ].slug ] === payload[ docs[ i ].slug ] ) {
                                                console.log( 'dispensary list for page ' + docs[ i ].slug + 'collected and stored' );
                                                globalPageCount++;
                                                if( globalPayload === globalPageCount ) {
                                                    that.emit( 'process complete' );
                                                }
                                            }
                                        }
                                    );

                                });
                            } else {
                                // there are no subregions to crawl
                                console.log( 'list construct not found, need to take other actions' );

                            }
                        });
                    }
                }
            });
        });


        
        // loop through regions in RegionData
        
            // get subregion slug
            
            // grab subregion page data
            
            // crawl list for slugs in subregion list
            
            // save slugs

        //this.emit( 'complete' );

    }
});*/