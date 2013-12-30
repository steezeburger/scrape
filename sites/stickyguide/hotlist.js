var base        = require( '../../lib/com/ganjazoid/ParserBaseClass' ),
    nodeio      = require( 'node.io' ),
    _           = require( 'underscore' ),
    colors      = require( 'colors' ),
    helpers     = require( '../../lib/com/ganjazoid/Helpers' ),
    config      = require( '../../app/configs' );    
    payload     = 0,
    scope       = null,
    numLoaded   = 0;
    hotlistCollection = [],
    summary           = {},
    hotlistURLs       = [],
    hotlist = {
        getListing: function( overrideURL ) {
            var self    = this;
                url     = ( overrideURL ) ? overrideURL : null,
                hasPagination   = false;

            if( numLoaded < payload ) {
                console.log( ' processing ', hotlistCollection[ numLoaded ] );
                
                console.log( '@@@@@@@@@@'.blue );
                console.log( '@@@@@@@@@@'.red );
                console.log( '@@@@@@@@@@ FETCHING: '.yellow.underline, ( url ) ? url : hotlistURLs[ numLoaded ] );
                console.log( '@@@@@@@@@@'.bold, numLoaded+1 );
                console.log( '@@@@@@@@@@'.red );
                console.log( '@@@@@@@@@@'.blue );

                scope.getHtml( hotlistURLs[ numLoaded ], function( err, $ ) {
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
                        summary.errors++;
                        console.log( 'no menu for dispensary' );
                        //limit--;
                    }

                    // we have a menu
                    if( hasRows ) {
                        summary.menus++;
                        summary.sources.push( dispensaries[ cur ] );
                        // once we have the html we need to see if there is pagination
                        var nextPage;
                        try {
                            nextPage        = $( '.pagination a' );
                            hasPagination   = true;
                            // it has it
                        } catch( e ) {

                        }

                        // we need to request all subsequent pages, and add to the expected payload
                        if( hasPagination ) {
                            // need to grab the pagination only once, so lets make sure any pages are 
                            for( var x = 0; x < nextPage.length; x++ ) {
                                var href = self.formatURL( nextPage[ x ].attribs.href , true, false );
                                // only inject if it's not there aleady
                                if( -1 === hotlistURLs.indexOf( href ) &&  // if it's not in the list already 
                                    -1 === href.indexOf( 'page=1' )) { // and it's not the first page in the pagination (since we hit the first page first, this is never relevant)
                                    hotlistURLs.splice( numLoaded + 1, 0, href );
                                    payload++;
                                }
                            }
                        }
                        self.processListing( menuRows, $ );
                    }
                });
                numLoaded++;
                self.getListing();
            } else {
                self.dispatch( self.constants.PROCESSS_COMPLETE );
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
                                var prices      = {};
                                prices.currency = ( value.children[ 0 ].raw === "$" )  ? 'US' : value.children[ 0 ].raw;
                                prices.unit     = helpers.trim( nodeGroup.stats[ z ].children[ 1 ].children[ 0 ].raw );
                                prices.price    = helpers.trim( nodeGroup.stats[ z ].children[ 0 ].children[ 1 ].raw );
                                PriceModel.prices.push( prices );
                            // this is the meta data section
                            } else {
                                PriceModel.meta.push({
                                    key:    helpers.trim( key.raw ),
                                    value:  helpers.trim( value.raw )
                                });
                            }
                        }
                        summary.items_parsed++;
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
            self.models.hotlist.create( data, function( err, document, count ) {
                if( err ) {
                    console.log( 'error: ', err );
                }
            });
        },
        formatURL: function( slug, absolutePath, addTail ) {
            var url = '',
                tail = ( false === addTail ) ? '' : '/menu.html?type_name=Flowers'; // this is the base parameter to flowers
            if( true === absolutePath ) {
                url += config.setting('stickyguide');
            }
            return url + slug + tail;
        },
        enQueue: function() {
            var self    = this,
                results = null;
            summary.errors          = 0,
            summary.critical_errors = 0,
            summary.success         = 0,
            summary.menus           = 0,
            summary.no_menus        = 0,
            summary.time_stared     = new Date(),
            summary.time_elapsed    = null,
            summary.items_parsed    = 0,
            summary.sources         = [];

            var curModel = _.where( self.models, { name : 'hotlist' } );
            curModel[0].model.find(function( err, resultSet ) {
                if( err ) {
                    throw err;
                }
                // with the results set, make sure you have documents,
                // then build up a queue to process and hit the rucursive
                // function until the listings are done 

                console.log( '@@found records: ', resultSet.length );
                hotlistCollection   = resultSet;
                payload             = hotlistCollection.length;
                if( resultSet === 0 ) {
                    self.endProcess( 'no documents found, cannot procceed' );
                    return;
                }
                for( var i in resultSet ) {
                    hotlistURLs.push( self.formatURL( resultSet[ i ].url, true ) );
                }
                self.getListing();
            });
        }
    };

// IO RUNNER
exports.job = new nodeio.Job({
    timeout: 120,   // process life max
    retries: 3,     //
    max: 120        // threads max
},
{
    input: false,
    run: function() {
        hotlist = _.extend( base.create(), hotlist );
        scope = this;
        hotlist.init( [ 'stickyguide_hotlist' ] );
        hotlist.listen( hotlist.constants.CONNECTED_SUCCESS, function( err, result ) {
            hotlist.enQueue();
        });
        hotlist.listen( hotlist.constants.PROCESSS_COMPLETE, function( err, result ) {
            scope.emit( 'process exited with success' );
        });
    }
});