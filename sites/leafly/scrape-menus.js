/**
  * @title:         Get Dispensary Menus, Leafly
  * @author:        Brian Kenny <papaviking@gmail.com>
  * @version:       0.1
  * @description:   This grabs and parses leafy's menus in the collection
  *                 
  * @dependencies:  node.io, underscore
  **/

var nodeio  = require( 'node.io' ),
    _       = require( 'underscore' ),
    colors  = require( 'colors' ),
    helpers = require( '../../lib/com/ganjazoid/Helpers' ),
    base    = require( '../../lib/com/ganjazoid/ParserBaseClass' ),
    config  = require( '../../app/configs' ),
    __      = console.log,
    ___     = process.stdout.write,
    scope   = {},
    summary = {},
    payloads = {},
    siteURL = 'http://www.leafly.com/dispensary-info/',
    urls    = [],
    scraper = {
      start: function( _offset ) {
        var self = this;
        summary.errors              = 0,
        summary.critical_errors     = 0,
        summary.success             = 0,
        summary.time_stared         = new Date(),
        summary.time_elapsed        = null,
        summary.dispensaries        = 0;
        payloads = new self.loader();
        payloads.init( 'leafly_dispensary_urls' );
        self.getModel( 'leafly_dispensary_urls' ).find({}, function( err, docs ){
          if( err ) {
            __( 'err', err );
          }
          
          __( docs.length );

          payloads.set( 'leafly_dispensary_urls', docs.length );
          urls = docs;
          self.getMenu();
        });
        
      },
      getMenu: function() {
          var self = this,
              curURL = siteURL + urls[ payloads.cur( 'leafly_dispensary_urls' ) ].url+'/menu';
          __( '\nfetching ', curURL );
          __( 'payload '.red, payloads.cur( 'leafly_dispensary_urls' ) )
          __( 'total '.green, payloads.total( 'leafly_dispensary_urls' ) )
          scope.getHtml( curURL, function( err, $ ) {
            var outer = null;
            try {
              outer = $( '#menu-items' );
            } catch( e ) {
              /*payloads.tick( 'leafly_dispensary_urls' );
              self.getMenu();*/
            }

            if( outer ) {
              _.each( outer.children, function( value, i, object ) {
                if( undefined !== value.children ) {
                  var title         = $( '.category-header h3', value ),
                      strains       = [],
                      prices        = [],
                      overview      = $( '.menu-category .menu-item .overview' , value );

                  title = title.children[0].raw;
                  _.each( overview, function( _value, _i, _object ) {
                    var strainName = null,
                        prices     = null,
                        pieces     = [],
                        unit, 
                        value,
                        price = {
                          t: null,
                          n: '',
                          ty: title.toLowerCase(),
                          s: config.setting( 'constants' ).LEAFLY,
                          ps: [],
                          cr: new Date()
                        }

                    try {
                      prices = _value.children[2];
                    } catch( e ) {
                      /*__( e );*/
                    }

                    try {
                      strainName = _value.children[1].children[0].children[0].children[0].children[0].raw;
                    } catch( e ) {
                      strainName = '';
                    }

                    price.t = strainName;

                    try {
                      pieces = $( 'dl', prices );
                    } catch( e ) {
                      pieces = '';
                    }

                    if( pieces ) {
                      process.stdout.write( '.'.green );
                      _.each( pieces, function( __value, __i, __object ) {
                        try {
                          var unitPrice = { 
                              p: __value.children[0].children[0].raw.replace( '$', '' ),
                              u: __value.children[1].children[0].raw
                          }
                          price.ps.push( unitPrice );
                        } catch( e ) {

                        }
                      });

                      self.getModel( 'items' ).create( price, function( err, doc ) {
                        if( err ) {
                        } else {

                        }
                      });
                    } else {
                      process.stdout.write( '.'.red );
                    }
                  });
                }
              });
            }

            payloads.tick( 'leafly_dispensary_urls' );
            
            if( payloads.met( 'leafly_dispensary_urls' ) ) {
              self.endProcess();
            } else {
              self.getMenu();
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
    __( 'run' );
    scope = this;
    scraper = _.extend( base.create(), scraper );
    scraper.listen( scraper.constants.PROCESS_COMPLETE, function() {
      scope.emit();
    });
    try {
      __( 'init' );
      scraper.init( [ 'leafly_dispensary_urls', 'items' ], 'start', process.argv );
    } catch( e ) {
      __( 'error', e );
    }
  }
});

