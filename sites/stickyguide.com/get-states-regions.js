var nodeio      = require( 'node.io'    );
var request     = require( 'request'    );
var _           = require( 'underscore' );
var mongoose    = require( 'mongoose'   );
var listingModel, listingSchema, db;

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

        // bind schema to model
        listingSchema = mongoose.Schema({
            type: Number,
            name: String,
            price: Number,
            unit: String,
            denotion: String,
            createdAt: Date,
            meta: {
                strength: Number,
                type: String,
                flavor: String,
                density: String
            },
            origin: {
                businessType: String,
                businessURL: String,
                listingURL: String,
                source: String
            }
        });

        // create data model
        listingModel = mongoose.model( 'Listings', listingSchema );

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
                    var ripper = function( chunk, state, payload ) { // to capture values in the closure, since this is async
                        // pulse these requests
                        setTimeout( function() {
                            request( base + chunk.url, function (error, response, body) {
                                
                                console.log( '#-REQUEST COMPLETE-#' );
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
                                        console.log( ':) yes, all jobs complete' );
                                        that.emit( ':) yes, all jobs complete' );
                                    }
                                    /*var listing = new listingModel({
                                        type: Number,
                                        name: String,
                                        price: Number,
                                        unit: String,
                                        denotion: String,
                                        createdAt: Date,
                                        meta: {
                                            strength: Number,
                                            type: String,
                                            flavor: String,
                                            density: String
                                        },
                                        origin: {
                                            businessType: String,
                                            businessURL: String,
                                            listingURL: String,
                                            source: String
                                        }
                                    });*/
                                    // else bail!

                                }
                            });
                        }, 500);
                    }
                    new ripper( chunk, state, payload[ state ] );
                }
            }
        });
    }
});