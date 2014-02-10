 /**
    * @title:         MODULE LIST
    * @author:        Brian Kenny <papaviking@gmail.com>
    * @version:       0.0
    * @description:   DESCRIPTION
    *                 
    * @dependencies:  
    **/

var nodeio  = require( 'node.io' ),
    _       = require( 'underscore' ),
    request = require( 'request' ),
    colors  = require( 'colors' ),
    jquery  = require( 'jquery' ),
    request = require( 'request' ), 
    cheerio = require( 'cheerio' ), 
    async   = require( 'async' ), 
    format  = require( 'util' ).format,
    helpers = require( '../../lib/com/ganjazoid/Helpers' ),
    base    = require( '../../lib/com/ganjazoid/ParserBaseClass' ),
    config  = require( '../../app/configs' ),
    __      = console.log,
    summary = {},
    scope   = null,
    baseURL = 'http://www.harborsidehealthcenter.com/shop/',
    pageList = [],
    itemList = [],
    urlPieces = [
        { type: 'flowers',      url: 'flowers.html?limit=all' },
        { type: 'concentrates', url: 'concentrates.html?limit=all' },
        { type: 'edibles',      url: 'edibles.html?limit=all' },
        { type: 'topicals',     url: 'topicals.html?limit=all' },
        { type: 'seeds',        url: 'seeds.html?limit=all' },
        { type: 'accessories',  url: 'accessories.html?limit=all' }
    ],
    Harborside = {
		start: function() {
			var self = this;
			
            summary.errors                 = 0,
	        summary.critical_errors        = 0,
	        summary.success                = 0,
	        summary.time_stared            = new Date(),
	        summary.time_elapsed           = null;

            payloads = new self.loader();
            payloads.init( 'harborside_pages' );
            payloads.set( 'harborside_pages', urlPieces.length - 1 );
            
            
            if( self.argOverrideURL ) {
                var overrideUrl = { url:self.argOverrideURL };
                itemList[ 0 ] = overrideUrl;
                payloads.init( 'harborside_items' );
                payloads.set( 'harborside_items', itemList.length - 1 );
                self.getItem();
                return;
            }
            // gets fresh urls
            self.scrapeMenu();
            // gets items on file only
            // self.scrapeItems();

		},
        scrapeMenu: function() {
            var self = this,
                curUrl = baseURL + urlPieces[ payloads.cur( 'harborside_pages' ) ].url;
            __( 'scraping: ', curUrl );
            scope.getHtml( curUrl, function( err, $ ) {
                var body = null;
                __( 'got', curUrl );
                if( err ) {
                    __( 'err', err );
                    self.next( 'harborside_pages' );    
                    return;
                }
                body = $( '.products-grid li' );
                _.each( body, function( v, i, o ) {
                    pageList.push( { url: v.children[0].attribs.href, type: urlPieces[ payloads.cur( 'harborside_pages' ) ].type } );
                });
                self.next( 'harborside_pages' );
                return;
            });            
        },
        scrapeItems: function() {
            var self = this,
                model = self.getModel( 'harborside_urls' );
            model.find( function( err, documents ) {
                itemList = documents;
                payloads.init( 'harborside_items' );
                payloads.set( 'harborside_items', itemList.length - 1 );
                self.getItem();
            });
        },
        getItem: function() {
            var self = this,
                 url = itemList[ payloads.cur( 'harborside_items') ].url;
            __( 'fetching', url );
            /*scope.getHtml( url, function( err, $ ) {*/
            request( url, function ( err, response, body ) {

                var titleNode, 
                    title, 
                    productOptionsNode, 
                    productOptions, 
                    $           = cheerio.load( body ), 
                    item        = {},
                    i           = 0,
                    js          = '',
                    finalItem   = {};

                if ( err ) throw err;
                
                
                $( 'script' ).each( function() {
                    var curChunk = this.text();
                    if( curChunk.indexOf( 'var spConfig' ) > -1 ) {
                        js = curChunk.replace('var spConfig = new Product.Config(', '');
                        js =       js.replace(');', '');
                    }
                    i++;
                });

                try {
                    curItem = JSON.parse( js );
                } catch( e ) {
                    __( 'could not parse item data: ', e );
                    self.next( 'harborside_items' );
                }

                _.each( curItem.ProductNames, function( v, i, o ) {
                    title = v.ProductName;
                });

                var finalType;
                try {
                    finalType = itemList[ payloads.cur( 'harborside_items') ].type
                } catch( e ) {
                    __( e );
                    finalType = 'other';
                }


                var finalItem = { 
                    t:  title,          // title
                    n:  '',             // normalized value
                    ty: finalType, // type
                    s:  '4',            // source
                    d:  '',  // dispensary id
                    ps: [],
                    cr: new Date()
                }

                // default
                var unitTypeAdapter = [
                    { raw: '28 G',  normalized: 'ounce' },
                    { raw: '1 OUNCE',  normalized: 'ounce' },
                    { raw: '3.5 G', normalized: 'eight' },
                    { raw: '3.5 GRAM', normalized: 'eight' },
                    { raw: '1 G',   normalized: 'gram'  },
                    { raw: '1 GRAM',   normalized: 'gram'  }
                ];

                var joinDetails = [];
                _.each( curItem.attributes, function( _item ) {
                    _.each( _item.options, function( _options ) {
                        var priceJoinDetails = {};
                        priceJoinDetails.weight  = _options.label;
                        priceJoinDetails.join_id = _options.products[0];
                        joinDetails.push( priceJoinDetails );
                    });
                });

                var curUnit, joinedData, convertedData, finalUnit;
                _.each( curItem.childProducts, function( v, k ) {
                    
                    joinedData = _.filter(joinDetails, function(obj) { return obj.join_id == k });
                    convertedData = _.filter( unitTypeAdapter, function(obj) { return obj.raw.toLowerCase() == joinedData[ 0 ].weight.toLowerCase() }); 
                    try {
                        finalUnit = convertedData[0].normalized;
                    } catch( e ) {
                        finalUnit = 'unit';
                    }
                    finalItem.ps.push( { 
                        p: v.finalPrice,  // price
                        u: finalUnit  // unit
                    } );
                }); 

                // setup item and save in group
                self.getModel( 'harborside_items' ).create( finalItem, function( err, count ) {
                    if( err ) {
                        __( err );
                        throw err;
                    }
                    self.next( 'harborside_items' );
                });
            }); 
        },
        next: function( which ) {
            var self = this;
            switch( which ) {
                case 'harborside_pages':
                    payloads.tick( 'harborside_pages' );
                    if( payloads.met( which ) ) {             
                        self.save( 'harborside_pages' );
                    } else {
                        self.scrapeMenu();
                    }
                break;
                case 'harborside_items':
                    payloads.tick( 'harborside_items' );
                    if( payloads.met( 'harborside_items') ) {
                        self.endProcess();
                    } else {
                        return self.getItem();
                    }
                break;
            }
        },
        save: function( which ) {
            var model, self = this;
            switch( which ) {
                case 'harborside_pages':
                    model = self.getModel( 'harborside_urls' );
                    model.remove( {}, function( err ) {
                        if( err ) {
                            __( 'did not drop entries: ', err );
                        } else {
                            model.create(
                                pageList,
                                function( err, document ) {
                                    self.scrapeItems();
                                }
                            );
                        }
                    });
                break;
                case 'harborside_items':
                    model = self.getModel( 'harborside_items' );
                    model.create(
                        mindedItems,
                        function( err, document ) {
                            if( err ) {
                                __( 'could not save items: ', err );
                            }
                            self.scrapeItems();
                        }
                    );
                break;
            }
        }
    }

// RUNNER

//scope = this;
/*Harborside = _.extend( base.create(), Harborside );        
Harborside.listen( Harborside.constants.COMPLETE, function( msg ) {
    __( 'exiting with ', msg);
    process.exit( 1 );
});

Harborside.init( [ 'harborside_urls', 'harborside_items' ], 'start', process.argv );
*/

exports.job = new nodeio.Job({
    timeout: 240,   // process life max
    retries: 3,     //
    max: 120        // threads max
},
{
    input: false,
    run: function() {
        scope = this;
        Harborside = _.extend( base.create(), Harborside );        
        Harborside.listen( Harborside.constants.COMPLETE, function( msg ) {
            scope.emit( msg );
        });
        Harborside.init( [ 'harborside_urls', 'harborside_items' ], 'start', process.argv );
    }
});



/*
var request = require('request')
  , cheerio = require('cheerio')
  , async = require('async')
  , format = require('util').format;

var reddits = [ 'programming', 'javascript', 'node' ]
  , concurrency = 2;

async.eachLimit(reddits, concurrency, function (reddit, next) {
    var url = format('http://reddit.com/r/%s', reddit);
    request(url, function (err, response, body) {
        if (err) throw err;
        var $ = cheerio.load(body);
        $('a.title').each(function () {
            console.log('%s (%s)', $(this).text(), $(this).attr('href'));
        });
        next();
    });
});
*/
