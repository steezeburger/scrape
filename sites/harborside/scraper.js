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
    helpers = require( '../../lib/com/ganjazoid/Helpers' ),
    base    = require( '../../lib/com/ganjazoid/ParserBaseClass' ),
    config  = require( '../../app/configs' ),
    __      = console.log,
    summary = {},
    scope   = null,
    baseURL = 'http://www.harborsidehealthcenter.com/shop/',
    urlPieces = [
        { type: 'flowers',      url: 'flowers.html' },
        { type: 'concentrates', url: 'concentrates.html' },
        { type: 'edibles',      url: 'edibles.html' },
        { type: 'topicals',     url: 'topicals.html' },
        { type: 'seeds',        url: 'seeds.html' },
        { type: 'accessories',  url: 'accessories.html' }
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
            self.scrape();
		},
        scrape: function() {
            var self = this,
                curUrl = baseURL + urlPieces[ payloads.cur( 'harborside_pages' ) ].url;
            __( 'scraping: ', curUrl );
            scope.getHtml( curUrl, function() {
                __( 'got', curUrl );
                payloads.tick( 'harborside_pages' );

                if( payloads.met( 'harborside_pages' ) ) {
                  self.endProcess();
                } else {
                  self.scrape();
                }

            });            
        }
    }


/* FOR NORMAL USE DEEZ ONE!
Harborside = _.extend( base.create(), Harborside );
Harborside.listen( Harborside.constants.COMPLETE, function() {
  process.exit( 0 );
});
Harborside.init( [], 'start', process.argv );
*/


// RUNNER
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
        Harborside.init( [ 'items' ], 'start', process.argv );
    }
});

