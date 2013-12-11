var nodeio      = require( 'node.io'    );
var request     = require( 'request'    );
var _           = require( 'underscore' );
var mongoose    = require( 'mongoose'   );
var RegionModel, RegionSchema, db;

exports.job = new nodeio.Job({
    timeout: 30,
    retries: 3,
    max: 20
},
{
    input: false,
    run: function() {
        // init database
        mongoose.connect('mongodb://localhost/ganjazoid');
        
        db = mongoose.connection;
        db.on( 'error', function() {
            console.log( 'connection error' );
        });
        db.once( 'open', function() {
            console.log( 'connection open' );
        });

        // bind region schema to model
        RegionSchema = mongoose.Schema({
            site: String,
            state: String,
            url: String,
            slug: String,
            lastUpdated: Date,
            id: Number
        });

        // create data model
        RegionModel = mongoose.model( 'RegionData', RegionSchema );

        // gets location list of live locations
        var base                = 'https://www.stickyguide.com',
            locationSource      = base + '/location',
            getParam            = '?id=',
            entryPointSelector  = '#live-locations';

        var slugify = function( input, slug ) {
            slug = slug || '-';
            return input.replace( ' ', slug ).replace(/\W/g, slug ).toLowerCase();
        }

        this.getHtml( locationSource, function( err, $ ) {
            if( err ) {
                this.exit( err );
            }

            var locations = [], locationData = {};
            // get all locations that are active
            locations = $( entryPointSelector );
            locations.children.each( function( div ) {
                // get the state
                var curState = div.attribs.class;
                // initialize a state holder for subregion data
                locationData[ curState ] = {};
                
                console.log( "Grabbing Region Data for: " + curState );
                
                div.children.each( function( el ) {

                    if( el.data === 'ul' ) {
                        el.children.each( function( li ) {
                            
                            if( li.data === 'li' ) {
                                var curAnchor = li.children[0],
                                    curRegionName = curAnchor.children[0].data,
                                    curRegionNameSlug = slugify( curRegionName, '_' );
                                
                                if( undefined === locationData[ curState ].regions ) {
                                    locationData[ curState ].regions = [];
                                }

                                var regionDetails = {};
                                regionDetails.name = curRegionName;
                                regionDetails.url  = curAnchor.attribs.href;
                                regionDetails.id   = curAnchor.attribs.href.split( getParam )[1];
                                
                                locationData[ curState ].regions.push( regionDetails );
                            }
                        });
                    }
                });
                console.log( "OK" );

            });

            var payload = [], count = [], totalPayload = 0, totalCount = 0; // keep track of the pay load of each regions sub-region count so we know when we're done loading all slugs

            // get payload information (if we did this inline, there are race conditions afoot)
            for(var state in locationData) {
                payload[ state ] = locationData[ state ].regions.length;
                totalPayload += payload[ state ]; // keep track so we know when all jobs are complete 
            }

            // grab slugs by following links by ID, this is how they do it right now probably to stop parsers
            for(var state in locationData) {
                
                count[ state ] = 0; // initialize a count per state
                
                console.log( '[[ expecting payload for  state ' + state + '  ' + payload );

                for( var i in locationData[ state ].regions ) {
                    var chunk = locationData[ state ].regions[ i ]; // convenience
                    var that = this;
                    var ripper = function( chunk, state, payload, i ) { // to capture values in the closure, since this is async
                        // pulse these requests
                        setTimeout( function() {
                            request( base + chunk.url, function (error, response, body) {
                                
                                console.log( '###- request complete' );
                                console.log( state );
                                console.log( response.request.uri.pathname );
                                console.log( '###- response' );
                                console.log( response.statusCode );

                                locationData[ state ].regions[ i ].slug = ( "404" === response.statusCode ) ?  '' : response.request.uri.pathname;
                                
                                console.log( '[[ '+state + ' payload ' + payload + ' == count @' + count[ state ] );

                                count[ state ]++;
                                totalCount++; 

                                if( payload === count[ state ] ) {
                                    console.log( state + '[!] [!] [!] payload complete for ' + state );
                                    // end condition, write data

                                    console.log( '###-###- all jobs complete?', totalPayload, totalCount );
                                    
                                    if( totalPayload == totalCount ) {
                                        var saveError = false;
                                        totalCount = 0;
                                        // iterate through one last time and save it down
                                        for( var _state in locationData ) {
                                            for( var j in locationData[ _state ].regions ) {

                                                // todo ADD VALIDATION!!!!
                                                //      needs to check for changes
                                                //      no dupes
                                                //
                                                var chunk = locationData[ _state ].regions[ j ]; // phew
                                                

                                                // add record for each region
                                                var regionModel = new RegionModel({
                                                    site:   'stickyguide.com',
                                                    name:   chunk.name,
                                                    state:  _state,
                                                    url:    chunk.url,
                                                    slug:   chunk.slug,
                                                    id:     chunk.id
                                                });


                                                RegionModel.find( { site: 'stickyguide.com' }, function( err, docs ) {
                                                    if( err ) {
                                                        console.log( '###!! error ' + err  );

                                                    } else {
                                                        console.log( '###@@ success' );

                                                        if( 0 === docs.length ) {
                                                            // not found, write new entry

                                                        } else {
                                                            // update entry
                                                            
                                                        }

                                                        totalCount++;
                                                        if( totalCount === totalPayload ) {
                                                            that.emit( 'complete' );
                                                        }
                                                    }
                                                });


                                                // save model
                                                /*regionModel.save(function( err, regionModel ){
                                                    if( err ) {
                                                        saveError = true;
                                                        console.log( 'db error:', err );
                                                    } else {
                                                        console.log( 'document saved' );
                                                    }
                                                });*/
                                            }
                                        }
                                    }
                                }
                            });
                        }, 500);
                    }

                    new ripper( chunk, state, payload[ state ], i );
                }
            }
        });
    }
});