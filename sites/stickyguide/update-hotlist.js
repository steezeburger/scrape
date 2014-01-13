/**
  * @title:         Update Hotlist
  * @author:        Brian Kenny <papaviking@gmail.com>
  * @version:       0.1
  * @description:   This module uses a collection of dispensary URLs, and sends a request to each.
  *                 With returned HTML, the script tests for a the presense of an HTML construct (the menu link)
  *                 and if that is encountered, proceeds to parse by row. This module also tests for pagination if
  *                 presense of the HTML construct is found, and adds the newly encountered menu pages to the request queue.
  *                 
  * @dependencies:  sites.stickyguide.get-dispensary-list
  **/

    // DEPENDENCIES
var nodeio          = require( 'node.io'                                ),
    request         = require( 'request'                                ),
    _               = require( 'underscore'                             ),
    mongoose        = require( 'mongoose'                               ),
    colors          = require( 'colors'                                 ),
    config          = require( '../../app/configs'                      ),
    schemas         = require( '../../app/schema'                       ),
    helpers         = require( '../../lib/com/ganjazoid/Helpers'        ),
    payloadManager  = require( '../../lib/com/ganjazoid/PayloadManager' ),
    base            = require( '../../lib/com/ganjazoid/ParserBaseClass'),
    config          = require( '../../app/configs'                      ),
    __              = console.log,
    validator       = require( '../../lib/com/ganjazoid/ValidatorBase'  );

// DYNAMIC
var ScrapeController,
    PriceModel,
    db,
    scope,
    dispensaries    = [],
    summary         = {},
    Validator       = validator.getInstance(),
    originalData    = null,
    pageURLs        = [],
    pageURLtypes    = [],
    stickyGuideTypes = [
        'topicals',
        'accessories',
        'concentrates',
        'edibles',
        'seeds_clones',
        'flowers',
        'prerolls'
    ],
    cur             = 0,
    limit           = 0,
    ScrapeController = {
        start: function( options ) {
            var self = this;

            // summary
            summary.errors          = 0,
            summary.critical_errors = 0,
            summary.success         = 0,
            summary.menus           = 0,
            summary.no_menus        = 0,
            summary.time_stared     = new Date(),
            summary.time_elapsed    = null,
            summary.items_parsed    = 0,
            summary.sources         = [];

            if( self.startAt ) {
                cur = self.startAt;
            } 


            self.enQueue();

            return self;
        },

        enQueue: function() {
            var self = this;
            var query = this.getModel( 'stickyguide_dispensaries' ).find().select( 'url' );
            query.exec( function( err, result ) {
                /* WHA?????? its fucked up unless I serialize it */
                var hmm = JSON.stringify( result );
                hmm = JSON.parse( hmm );
                if( result === 0 ) {
                    self.endProcess( 'no documents found, cannot procceed' );
                    return;
                } else {
                    originalData    = result;
                    temp            = [];
                    // TEST
                    //pageURLs.push( self.formatURL( '/dispensaries/natural-herbal-pain-relief', true ) );
                    //  ITS NOT LETTING ME READ THE URL PROPERTY OF THE DOCUMENT WTOFFFFFFF 
                    _.each( hmm, function( v, i, o ) {
                        dispensaries.push( v );
                        _.each( stickyGuideTypes, function( _v, _i, _o ) {
                            var newUrl = self.formatURL( v.url, true, true, _v ); //slug, absolutePath, addTail, schema
                            pageURLs.push( newUrl );
                            pageURLtypes.push( _v );
                        });                        
                    });
                    // for testing, use override=http://url for single use
                    if( self.argOverrideURL ) {
                        pageURLs = [];
                        _.each( stickyGuideTypes, function( v, i, o ) {
                            pageURLs.push( self.formatURL( self.argOverrideURL, true, true, v ) );
                            pageURLtypes.push( v );
                        });
                    }

                    limit = ( self.endAt ) ? self.endAt : pageURLs.length; // 1 to test
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

                __( '@ url: '.yellow.underline, ( url ) ? url : pageURLs[ cur ] );
                __( '@ at: '.bold, parseInt(cur)+1 );
                __( '@ total: '.green, pageURLs.length );

                // get the page
                var whichUrl = ( url ) ? url : pageURLs[ cur ];                    
                scope.getHtml( whichUrl, function( err, $ ) {

                    // if not, proceed to parse the page
                    var menuRows,
                        documentCollection,
                        hasRows = false,
                        items = [];

                    try {
                        menuRows    = $( '.flower-snippet .flower-details' );
                        hasRows     = true;
                        __( 'data detected'.green.underline );
                        // tick up payload
                    } catch( e ) {
                        summary.errors++;
                        __( '! no menu for dispensary'.red, hasRows );
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
                            __('pagination detected');
                            // need to grab the pagination only once, so lets make sure any pages are 
                            for( var x = 0; x < nextPage.length; x++ ) {
                                var href = self.formatURL( nextPage[ x ].attribs.href , true, false, pageURLtypes[ cur ] );
                                // only inject if it's not there aleady
                                if( -1 === pageURLs.indexOf( href ) &&  // if it's not in the list already 
                                    -1 === href.indexOf( 'page=1' )) { // and it's not the first page in the pagination (since we hit the first page first, this is never relevant)
                                    __( 'not in list', href );
                                    pageURLs.splice( cur + 1, 0, href );
                                    limit = pageURLs.length;
                                } else {
                                    __( 'already in list', href );
                                }
                            }
                        }
                        self.processListing( menuRows, $ );
                    }

                    cur++;
                    // recursivelt till its done
                    self.getListing();
                });
            } else {
                summary.time_elapsed = new Date();
                __( '@ Processing Summary @'.green.underline );
                self.saveHotlist( summary.sources );
                delete summary.sources;
                __( summary );
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

/*            switch( listingType ) {
                case "flower":*/
            for( var i = 0; i < menuRows.length; i++ ) {
                //console.log( 'processing column ' + i );

                // get nodes
                var nodeGroup       = {};
                nodeGroup.titleNode = $( 'h5 a',   menuRows[ i ] );
                try {
                    nodeGroup.stats = $( '.stats .stat', menuRows[ i ] );
                } catch( e ) {
                    __('could not parse data for row');
                    return false;
                }
                // parse data
                PriceModel     = {};
                PriceModel.t   = nodeGroup.titleNode.children[ 0 ].raw,
                PriceModel.n   = '', // to be processed later
                PriceModel.s   = config.setting( 'constants' ).STICKYGUIDE,
                PriceModel.ty  = pageURLtypes[ cur ],
                PriceModel.cr  = new Date();
                PriceModel.ps  = [];

                for( var z = 0; z < nodeGroup.stats.length; z++ ) {
                    var value = nodeGroup.stats[ z ].children[ 0 ].children[ 0 ],
                        key   = nodeGroup.stats[ z ].children[ 1 ].children[ 0 ];
                    // this is the price section
                    if( value.raw.indexOf( 'span class' ) > -1 ) {
                        var prices      = {};
                        prices.u = helpers.trim( nodeGroup.stats[ z ].children[ 1 ].children[ 0 ].raw );
                        prices.p = helpers.trim( nodeGroup.stats[ z ].children[ 0 ].children[ 1 ].raw );
                        PriceModel.ps.push( prices );
                    }
                }
                summary.items_parsed++;
                self.save( PriceModel );
            }
/*                break;
            }
*/            return true;
        }, 

        save: function( data ) {
            var self = this;
            if( undefined === data ) {
                return false;
            }
            self.getModel( 'items' ).create( data, function( err, document, count ) {
                if( err ) {
                    console.log( 'error: ', err )
                }
            });
        },

        saveHotlist: function( list ) {
            var self = this;
            if( undefined === list ) {
                return false;
            }
            __( '@@@@@ save hot list'.red, list );
            self.getModel( 'stickyguide_hotlists' ).remove({}, function( err ) {
                __( '@@ REMOVED'.green, err );
                self.getModel( 'stickyguide_hotlists' ).create(
                    list, 
                    function( err, document ) {
                        if( err ) {
                            __( '@@ ERROR SAVING HOTLIST @@'.red, err );

                        } else {
                            __( '@@ SAVED'.blue, arguments );
                        }
                        self.endProcess();
                    }
                );
            });
        },

        formatURL: function( slug, absolutePath, addTail, schema ) {
            var self = this,
                tail = '',
                url  = '';
            if( true === addTail ) {
                switch( schema ) {
                    case 'seeds_clones':
                        tail = ( false === addTail ) ? '' : '/menu.html?type_name=Seeds+%26+Clones';
                    break;
                    case 'topicals':
                        tail = ( false === addTail ) ? '' : '/menu.html?type_name=Topicals';
                    break;
                    case 'accessories':
                        tail = ( false === addTail ) ? '' : '/menu.html?type_name=Accessories';
                    break;
                    case 'concentrates':
                        tail = ( false === addTail ) ? '' : '/menu.html?type_name=Concentrates';
                    break;
                    case 'edibles':
                        tail = ( false === addTail ) ? '' : '/menu.html?type_name=Edibles';
                    break;
                    case 'prerolls':
                        tail = ( false === addTail ) ? '' : '/menu.html?type_name=Pre+Rolls';
                    break;
                    case "flowers":
                    default:
                        tail = ( false === addTail ) ? '' : '/menu.html?type_name=Flowers'; // this is the base parameter to flowers
                    break;
                }  
            }

            if( true === absolutePath ) {
                url += config.setting( 'stickyguide' );
            }
            return url + slug + tail;
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
        ScrapeController = _.extend( base.create(), ScrapeController );        
        ScrapeController.listen( ScrapeController.constants.COMPLETE, function( msg ) {
            scope.emit( msg );
        });
        ScrapeController.init( [ 'stickyguide_dispensaries', 'stickyguide_hotlists', 'items' ], 'start', process.argv );
    }
});