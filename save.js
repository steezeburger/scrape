// run as node.io -s save "http://www.google.com/" > google.html
var nodeio = require( 'node.io' );
var request = require( 'request' );
var _ = require('underscore');
exports.job = new nodeio.Job({
    input: false,
    run: function() {
        // STICKYGUIDE

        // gets location list of live locations
        var base                = 'https://www.stickyguide.com',
            locationSource      = base + '/location',
            getParam            = '?id=',
            entryPointSelector  = '#live-locations';

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
                console.log( "Grabbing Region Data for:" + curState );
                div.children.each( function( el ) {
                    if( el.data === 'ul' ) {
                        el.children.each( function( li ) {
                            if( li.data === 'li' ) {
                                var curAnchor = li.children[0],
                                    curRegionName = curAnchor.children[0].data;
                                if( undefined === locationData[ curState ].regions ) {
                                    locationData[ curState ].regions = {};
                                }
                                if( undefined === locationData[ curState ].regions[ curRegionName ] ) {
                                    locationData[ curState ].regions[ curRegionName ] = {};
                                    locationData[ curState ].regions[ curRegionName ].name = curRegionName;
                                    locationData[ curState ].regions[ curRegionName ].url  = curAnchor.attribs.href;
                                    locationData[ curState ].regions[ curRegionName ].id   = curAnchor.attribs.href.split( getParam )[1];
                                    console.log( locationData[ curState ].regions[ curRegionName ] );
                                }

                            }
                        });
                    }
                });
                console.log( "complete" );
                console.log( "Grabbing Region Data Slugs for:" + curState );
                
                _.each(locationData, function( regions ){
                    _.each(regions, function( regionName ) {
                        console.log( regionName );
                    });
                });

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
    
        });
    }
});