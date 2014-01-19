/**
  * @title:         Get Dispensary List
  * @author:        Brian Kenny <papaviking@gmail.com>
  * @version:       0.1
  * @description:   This grabs leafy's dispensary search via their json query api. 
  *                 
  * @dependencies:  node.io, underscore
  **/

var nodeio  = require( 'node.io' ),
    _       = require( 'underscore' ),
    fs      = require( 'fs' ),
    request = require( 'request' ),
    colors  = require( 'colors' ),
    helpers = require( '../../lib/com/ganjazoid/Helpers' ),
    base    = require( '../../lib/com/ganjazoid/ParserBaseClass' ),
    config  = require( '../../app/configs' ),
    __      = console.log,
    //startURL      = 'http://www.leafly.com/finder/search?&loadfacets=true&sort=BestMatch&page=0&take=10&searchradius=1000&latitude=35.646162&longitude=-96.59375',
    startURL      = 'shttp://www.leafly.com/finder/search?&loadfacets=true&sort=BestMatch&page=0&take=700&searchradius=1679&latitude=35.646162&longitude=-96.59375',
    summary       = {},
    payloads      = {},
    scope         = null,
    dispensaries  = [];
    listCrawler   = {
      start: function( _offset ) {
        var self = this;
        summary.errors              = 0,
        summary.critical_errors     = 0,
        summary.success             = 0,
        summary.time_stared         = new Date(),
        summary.time_elapsed        = null,
        summary.dispensaries        = 0;

        if( _offset ) {
          offset = _offset;
        }

        payloads = new self.loader();
        payloads.init( 'master_file' );

        __( 'requesting master file', startURL );
        request( startURL, function (error, response, body) {
          __('found' );
          try {
            var dataFile = JSON.parse( body );
            _.each(dataFile.Results, function( value, i, object) {
              var dispensary = null;
              dispensary = {
                name: value.Name,
                url:  value.UrlName
              };
              if( dispensary ) {
                self.getModel( 'leafly_dispensary_urls' ).update(
                  dispensary,
                  dispensary,
                  { upsert: true },
                  function( err, document ) {
                    if( err ) {
                      __( 'error adding dispensary' );
                    }
                    __( 'added dispensary' );
                  }
                );
              }
            });
          } catch( e ) {
            __( e );
          }
        });
      }
    }

exports.job = new nodeio.Job({
    timeout: 240,   // process life max
    retries: 3,     //
    max: 120        // threads max
},{
    input: false,
    run: function() {
        scope = this;
        var arg = null;
        if( process.argv.length > 4 ) {
          arg =  process.argv[ 4 ];
        } 
        listCrawler = _.extend( base.create(), listCrawler );
        listCrawler.listen( listCrawler.constants.PROCESS_COMPLETE, function() {
          scope.emit();
        });
        listCrawler.init( [ 'leafly_dispensary_urls' ], 'start', arg );
    }
});

