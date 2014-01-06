
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
    start     = null,
    cur       = 0,
    end       = null,
    limitDefault = 50,
    limit     = null,
    batchPayload = 0,
    scope   = this,
    __      = console.log,
    cleanser = {
        start: function() {
            var self   = this,
                model  = self.getModel( 'prices' );
                start  = self.startAt || 0;
                limit  = self.limitTo || limitDefault;
                end    = self.endAt   || null;
            __( 'finding');
            self.fetchBatchSize();
        },
        fetchBatchSize: function() {
            var self   = this,
                model  = self.getModel( 'prices' );
            model.find({type: {
                $in: [ "flower", "Indica", "Sativa", "Hybrid" ]
            }}).count().exec(function( err, count ) {
                __( 'records to process', count );
                batchPayload = count;
                self.toiletpaper( start, null );
            });
        },
        queue: function( start ) {
            var self = this,
                model  = self.getModel( 'prices' );
            if( start ) {
                cur = start;
            } else {
                cur += limit;
            }
            return model.find({
                type: {
                    $in: [ "flower", "Indica", "Sativa", "Hybrid" ]
                }
            }).skip( cur ).limit( limit );
        },
        toiletpaper: function( start, docs ) {
            var self = this;
            __('queue place'.green, cur );
            __('remaining'.green, batchPayload - cur );
            __('total'.yellow, batchPayload );
            // TODO process docs
            // ...
            // ...
            if( cur < batchPayload ) {
                var query = ( start ) ? self.queue( start ) : self.queue();
                setTimeout( function() {
                    query.exec(function( err, docs ) {
                        self.toiletpaper( null, docs );
                    });
                }, 1000);
                
            } else {
                self.endProcess();
            }
        }
    };


    cleanser = _.extend( base.create(), cleanser );
    cleanser.listen( cleanser.constants.PROCESS_COMPLETE, function() {
      
    });
    cleanser.init( [ 'prices' ], 'start', process.argv );

/*
// gets ride of parenthesis and contents

var patt2 = /\((.*?)\)/;

var match = str2.match( patt2, '' );
str2 = str2.replace( match[0] + ' ' , '' );
*/

// clear all parenthesis contents
// remove dollar and numbers immediately after till next whitespace
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
