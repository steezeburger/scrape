var nodeio      = require( 'node.io'    );
var request     = require( 'request'    );
var _           = require( 'underscore' );
var mongoose    = require( 'mongoose'   );
var site        = require( './schema/site' );
var schemas     = require( './schema/regions' );
var RegionModel, 
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

exports.job = new nodeio.Job({
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
});