
/**
  * @title:         Get Dispensary List
  * @author:        Brian Kenny <papaviking@gmail.com>
  * @version:       0.1
  * @description:   This grabs leafy's dispensary search via their json query api. 
  *                 
  * @dependencies:  node.io, underscore
  **/

var _       = require( 'underscore' ),
    colors  = require( 'colors' ),
    helpers = require( '../lib/com/ganjazoid/Helpers' ),
    base    = require( '../lib/com/ganjazoid/ParserBaseClass' ),
    config  = require( '../app/configs' ),
    types   = [
        "flower",
        "Indica",
        "Sativa",
        "Hybrid"
    ],
    delimitedStrains = [
        'ak-47'

    ]
    start           = null,
    cur             = 0,
    end             = null,
    limitDefault    = 1,
    limit           = null,
    batchPayload    = 0,
    initLoadCount   = 0,
    initLoadPayload = 3,
    scope           = this,
    leaflyStrains   = [],
    seedfinderStrains = [],
    scope           = this,
    __              = console.log,
    cleanser = {
        start: function() {
            var self   = this,
                model  = self.getModel( 'items' );
                start  = self.startAt || -1;
                limit  = self.limitTo || limitDefault;
                end    = self.endAt   || null;

            if( self.clean ) {
                self.toiletpaper( start, [{t:self.clean}] );
            } else {
                self.fetchBatchSize();
                self.getStrainLists();
            }
        },
        fetchBatchSize: function() {
            var self   = this,
                model  = self.getModel( 'items' );
            model.find({
                            ty: {
                                $in: [ "flower", "Indica", "Sativa", "Hybrid" ]
                            }
                        }
            ).count().exec(function( err, count ) {
                __( 'records to process', count );
                batchPayload = count;
                initLoadCount++;
                self.checkForInitComplete();
            });
        },
        getStrainLists: function() {
            var self = this;
                self.getModel( 'leafly_strains' ).find({},function(err,docs){
                    leaflyStrains = docs;  
                    initLoadCount++;
                    self.checkForInitComplete();                    
                });
                self.getModel( 'seedfinder_strains' ).find({},function(err,docs){
                    seedfinderStrains = docs;   
                    initLoadCount++;
                    self.checkForInitComplete();
                });
        },
        checkForInitComplete: function() {
            var self = this;

            if ( initLoadCount === initLoadPayload ) {
                return self.toiletpaper( start, null );
            } else {
                return false;
            }
        },
        queue: function( start ) {
            var self = this,
                model  = self.getModel( 'items' );
            if( start ) {
                cur = start;
            } else {
                cur += limit;
            }
            return model.find({
                ty: {
                    $in: [ "flower", "Indica", "Sativa", "Hybrid" ]
                }
            }).skip( cur ).limit( limit );
        },
        toiletpaper: function( start, docs ) {
            var self = this;
            __('queue place'.white, cur );
            __('remaining'.green, batchPayload - cur );
            __('total'.yellow, batchPayload );

            // process docs
            if( undefined !== docs ) {
                _.each( docs, function( v, i , o ) {
                    __( 'analyzing ', v.t );
                    var name = v.t.toLowerCase();
                    // complex to simple
                    name = self.itemRegexRemove( name );
                    //name = self.removeDelimitedContent( name );
                    name = self.removeItems( name );
                    name = self.trim( name );
                    
                    
                    __( 'clean ', name );
                    self.getModel( 'items').update(
                        { _id: v._id },
                        { n: name }, 
                        { upsert: false },
                        function( err, count ) {
                            __( 'updated', err, count );
                        }
                    );
                });
            } else {
                __( 'error with document' );
            }
                
            
            if( cur < batchPayload ) {
                var query = ( start ) ? self.queue( start ) : self.queue();
                //setTimeoutw( function() {
                    query.exec(function( err, docs ) {
                        if( err ) {
                            __( 'err', err );
                        }
                        self.toiletpaper( null, docs );
                    });
                //}, 1000);
                
            } else {
                __( 'ending process' );
                self.endProcess();
            }
        },

        /***********************/
        /* CLEANSING FUNCTIONS */
        /***********************/

        removeItems: function( perp ) {
            var self = this;
            perp = perp.toLowerCase();
            var bullshitWords = [
                'd.o.g.o',
                'dogo',
                'sale',
                'hybrid',
                'indica',
                'sativa',
                '1/2',
                '1/4',
                '1/8th',
                /*'8th',*/
                '1/8',
                '1/2',
                'ounce',
                'eigth',
                'quarter',
                'thc-a',
                'thca',
                'thc',
                'on special',
                'private reserve',
                'special',
                'exclusive',
                'top-shelf',
                'top shelf',
                'bottom-shelf',
                'bottom shelf',
                'medium-shelf',
                'medium shelf',
                'free gram',
                'this week only',
                'exclusive',
                'new vendor item',
                'buy one get 1 free',
                'buy one get one free',
                'buy 1 get 1 free',
                'buy 1 get one free',
                'cbd'
            ]
            _.each( bullshitWords, function( v, i, o ) {
                if( perp.indexOf( v ) > -1 ) {
                    __( 'removing', v );
                    perp = perp.replace( v, '' );
                }
            });
            return perp;
        },

        smartSelect: function( perp ) {

        },
        
        itemReplace: function( perp ) {
            var self = this;
            var normalized = [
                { 
                    original: ' og ', 
                    synonyms:[
                        /\s+o\.{1}g\.{0,1}\s+/gi // matches o.g. o.g
                    ]
                },
                {
                    original: '\'',
                    synonyms: [
                        '&x27;'
                    ]
                },
                {
                    original: 'grandaddy purple',
                    synonyms: [
                        /gdp/gi,
                        /grandaddy purps/gi,
                        /purps/gi,
                    ]
                },
                {
                    original: ' ',
                    synonyms: [
                        /\s{2,}/gi // two or more spaces
                    ]
                }
            ];
            _.each( normalized, function( v, i, o ) {
                var masterValue = v.original;
                _.each( v.synonyms, function( _v, _i , _o ) {
                    if( typeof( _v ) === 'object' ) {       // it's a regexp
                        if( _v.test( perp ) ) {
                            perp = perp.replace( _v, masterValue );
                        }
                    } else {                            // string comp
                        if( perp.indexOf( _v ) > -1 ) {
                            perp = perp.replace( _v, masterValue );
                        }
                    }
                });
            });
            return perp;
        }, 

        itemRegexRemove: function( perp ) {
            var self = this,
                exes = [
                    /[0-9]*\.?[0-9]+%/gi,                            // percentage 00.00%
                    /\$[0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{2})?/gi,  // currency
                    /\*+([^*]*)\*+/gi,                               // * delimiter *
                    /\[+([^*]*)\]+/gi,                               // [] del
                    /\-+([^*]*)\-+/gi,                               // - delimiter -
                    /\(+([^*]*)\)+/gi,                               // ( delimiter )
                    /\{+([^*]*)\}+/gi,                               // { delimiter }
                    /\d+(g){0,1}(gs){0,1}\s+for/gi,                  // 0g(s) for
                    /\d+\.{0,1}\d{0,1}\s+gram(s){0,1}|eighth(s){0,1}|quarter(s){0,1}|qtr(s){0,1}|ounce(s){0,1}|gr(s){0,1}\s+for/gi,
                    /\s+\d+g\s+/gi,                                  // things like 10g, 5g, .5g
                    /\d+g\s{0,1}[@]{1}\s{0,1}\d/gi,                  // 2g@30
                    /8th(s){0,1}/gi,                                 // 8th or 8ths
                    /\d+g\/8th/,                                     // 4g/8th
                    /\d+g(s){0,1}\s+for\s+[$]{0,1}\d+/gi,            // 2g for $30
                    /\d+\s{0,1}gram\s{0,1}[@]/gi,                    // 3 gram @
                    /\s+([^*]*)\/([^*]*)\/([^*]*)\s+/gi,              // gets " contennt/between/shit "
                    /\d+g\s{0,1}[@]{1}\s{0,1}\d/gi,                  // another 2g for x dollars
                    /\.+/gi,                                          // remove .
                    /[◆]+/gi,
                    /[!]+/gi,                    
                    /[~]+/gi,
                    /[!]+/gi,
                    /[#]{2,}/gi,
                    /[:]+/gi,
                    /[-]+/gi,
                    /[$]+/gi
                ];
            _.each( exes, function( v, i ,o ) {
                var rx = new RegExp( v );
                if( rx.test( perp ) ) {
                    perp = perp.replace( rx, '' );
                }
            });
            return perp;
        },
        trim: function( perp ) {
            return perp.trim();
        }
    };


    cleanser = _.extend( base.create(), cleanser );
    cleanser.listen( cleanser.constants.COMPLETE, function() {
      process.exit( 0 );
    });

    try {
        cleanser.init( [ 'items', 'leafly_strains', 'seedfinder_strains' ], 'start', process.argv );
    } catch( e ) {
        __( e );
    }

/*
// gets ride of parenthesis and contents

var patt2 = /\((.*?)\)/;

var match = str2.match( patt2, '' );
str2 = str2.replace( match[0] + ' ' , '' );
*/

// clear all parenthesis contents

// remove html entity encodings &#x27; and use a single quote?
// remove strings * things like this * and 
//                ** things like this **, and 
//                *** this! ***, and 
//                **** this... ****
// remove decimal values with % signs appended 00.00%
// remove THC, CBD acronym
// remove $00.00, $00
// remove ! content between !
// remove all !
// remove ◆
// turn \sOG\s into \sO.G.\s ( or visa versa ) and O.G\s into O.G.\s
// remove content : after and including this
// remove /\s[or]\s/
// remove {d} for {d}
// remove {d}for{d}
// remove [ content between these ]
// remove 1/2, 1/4, 1/8, 1/8th, {d}G, {d} GRAMS, {d}GRAMS, 
//        {d}%, {d}grm
// remove || content after this delimiter
// remove single *
// remove B.O.G.O ?
// remove ~
// remove SALE, sale
// remove DOGO, dogo, D.O.G.O, d.o.g.o
// remove | content like this |
// remove "quoted content" (maybe)
// remove anything after a /
// remove patterns like:
//     5 grams @ 45, 7 grams for 60, 4 Gram 1/8th
// remove words HYBRID, INDICA, SATIVA
// remove {w}-{w} Things after a dash if there are numbers, or before the dash if there are numbers before
// remove - things like this - and -- things like this --
// make lower case
// trim edges
// 
