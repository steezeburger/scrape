// run as node.io -s save "http://www.google.com/" > google.html
var nodeio  = require( 'node.io' );
var request = require( 'request' );
var _       = require( 'underscore' );

exports.job = new nodeio.Job({
    input: false,
    run: function() {
        // STICKYGUIDE

        // gets location list of live locations
        var base                = 'https://www.stickyguide.com',
            locationSource      = base + '/location',
            getParam            = '?id=',
            entryPointSelector  = '#live-locations';

        var slugify = function( input, slug ) {
            slug = slug || '-';
            return input.replace( ' ', slug ).replace(/\W/g, slug ).toLowerCase();
        }

/*        request(locationSource, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            console.log(response.request.uri.pathname) // Print the google web page.
          }
        });*/

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
                                /*if( undefined === locationData[ curState ].regions[ curRegionName ] ) {*/
                                    
/*                                    locationData[ curState ].regions.{}.name = curRegionName;
                                    locationData[ curState ].regions.{}.url  = curAnchor.attribs.href;
                                    locationData[ curState ].regions.{}.id   = curAnchor.attribs.href.split( getParam )[1];
                                    console.log( locationData[ curState ].regions );
*/                                /*}*/
                            }
                        });
                    }
                });
                console.log( "OK" );

                // region data has been collected, now we need to get the slugs
                /*console.log( 'calling for slug from : ' + base + curAnchor.attribs.href );
                request( base + curAnchor.attribs.href, function (error, response, body) {
                  if (!error && response.statusCode == 200) {
                    locationData[ curState ].regions[ curRegionName ].slug = response.request.uri.pathname;
                    console.log(response.request.uri.pathname) // Print the google web page.
                    if( payload === count ) {
                        console.log( locationData );
                    }
                  }
                });*/

            });
    
            // grab slugs by following links by ID, this is how they do it right now probably to stop parsers
            for(var state in locationData) {
                for( var i in locationData[ state ].regions ) {
                    var chunk = locationData[ state ].regions[ i ];
                    var ripper = function( chunk, state, i ) {
                        setTimeout( function() {
                            request( base + chunk.url, function (error, response, body) {
                                
                                console.log( '#------' );
                                console.log( state );
                                console.log( response.request.uri.pathname );
                                console.log( '#--- response ---' );
                                console.log( response.statusCode );

                                locationData[ state ].regions[ i ].slug = response.request.uri.pathname;

                            });
                        }, 1000);
                    }
                    new ripper( chunk, state, i );
                }
            }

            /*_.each(locationData, function( regions ){
                console.log( 'regions = ' );
                console.log( regions );
                _.each(regions, function( region) {
                    console.log( '===========region = ' );
                    console.log( region );
                });
            });*/

        });
    }
});