
  /**
    * @title:         Process Dispensary List
    * @author:        Brian Kenny <papaviking@gmail.com>
    * @version:       0.1
    * @description:   This crawls through the weedmaps collection of dispensaries and parses their shit
    *                 
    * @dependencies:  node.io, underscore, request
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
    startURL      = 'https://www.weedmaps.com',
    summary       = {},
    payloads      = {},
    dispensaries  = [],
    offset        = null,
    selector      = '.menu_item';

    scope         = null,
    dispensaryCrawler = {
      start: function() {
        var self = this;

        summary.errors                 = 0,
        summary.critical_errors        = 0,
        summary.success                = 0,
        summary.time_stared            = new Date(),
        summary.time_elapsed           = null,
        summary.dispensaries_processed = 0,
        summary.menu_items             = 0;

        if( self.startAt ) {
          __('setting offset', self.startAt);
          offset = self.startAt;
        }

        payloads = new self.loader();
        payloads.init( 'weedmaps_dispensary_urls' );
        payloads.init( 'items' );
        self.getCollection();

      },
      getCollection: function() {
        var self = this;
        self.getModel( 'weedmaps_dispensary_urls' ).find({}, function( err, collection ) {
          if( err ) {
            __( err );
            summary.errors++;
          }
          dispensaries = collection;
          __( '@@ queued '.green, dispensaries.length );
          var maxVal = ( self.endAt && self.endAt <= dispensaries.length ) ? self.endAt : dispensaries.length;
          payloads.set( 'weedmaps_dispensary_urls', maxVal );
          self.pillage();
        });
      },
      formatURL: function( portion, abs, params ) {
        var self = this,
        url  = '';
        if( abs ) {
          url += startURL;
        }
        url += portion;
        if( params ) {
          url += params;
        }
        return url;
      },
      pillage: function() {
        var self = this;
        var curIndex;
        if( offset ) {
          curIndex = offset;
          payloads.tick( 'weedmaps_dispensary_urls', offset );
          offset = null;
        } else {
          /*__( 'payloads.cur', payloads.cur( 'weedmaps_dispensary_urls' ) );*/
          curIndex = payloads.cur( 'weedmaps_dispensary_urls' );
        }
        scope.getHtml( self.formatURL( dispensaries[ curIndex ].url, true ), function( err, $ ) {  
          var items;
          try {
            items = $( selector );
          } catch( e ) {
            __( 'error: '.red, e );
            summary.errors++;
            payloads.tick( 'weedmaps_dispensary_urls' );
            return self.pillage();
          }
          payloads.set( 'items', ( payloads.cur( 'items' ) + (items.length-1) ) );
          _.each( items, function( value, i, original ) {
            var hasData;
            try {
              hasData = value.attribs[ 'data-json' ];
            } catch( e ) {
              hasData = false;
            }
            if( hasData ) {
              var honeypot = JSON.parse( helpers.decodeHTML( hasData )),
                  category = value.attribs[ 'data-category-name' ],
                  price = {
                    t: honeypot.name,
                    n: '',
                    s: config.setting( 'constants' ).WEEDMAPS,
                    ty: category,
                    ps: [
                        { 
                          p: honeypot.price_eighth,
                          u: "eighth"
                        },
                        { 
                          p: honeypot.price_gram,
                          u: "gram"
                        },
                        { 
                          p: honeypot.price_half_gram,
                          u: "half-gram"
                        },
                        { 
                          p: honeypot.price_half_ounce,
                          u: "half-ounce"
                        },
                        { 
                          p: honeypot.price_ounce,
                          u: "ounce"
                        },
                        { 
                          price: honeypot.price_quarter,
                          u: "quarter"
                        },
                        { 
                          p: honeypot.price_unit,
                          u: "unit"
                        }
                    ],
                    ca: new Date()
                  };
                  self.getModel( 'items' ).create( price, function( err, savedItem ) {
                    if( err ) {
                      __( 'save error'.red , err );
                      summary.errors++;
                    } else {
                      summary.menu_items++;
                    }
                    payloads.tick( 'items' );
                  });
            } else {
              payloads.tick( 'items' );
            }         
          });

          // keep track of the grande payload
          payloads.tick( 'weedmaps_dispensary_urls' );
          // end it?
          if( payloads.met( 'weedmaps_dispensary_urls' ) /*&& payloads.met( 'prices' )*/ ) {
            summary.time_elapsed = new Date();
            self.endProcess( summary );
          } else {
            summary.dispensaries_processed++;
            __( 'dispensary payload'.green, payloads.cur( 'weedmaps_dispensary_urls' ), payloads.total( 'weedmaps_dispensary_urls' ) );
            __( 'price payload'.yellow,     payloads.cur( 'items' ),                   payloads.total( 'items' ) );
            self.pillage();
          }
        });
      }
    };

exports.job = new nodeio.Job({
    timeout: 240,   // process life max
    retries: 3,     //
    max: 120        // threads max
},{
    input: false,
    run: function() {
        scope = this;

        dispensaryCrawler = _.extend( base.create(), dispensaryCrawler );
        dispensaryCrawler.listen( dispensaryCrawler.constants.COMPLETE, function( msg ) {
            scope.emit( msg  );
        });
        try { 
          dispensaryCrawler.init( [ 'weedmaps_dispensary_urls', 'items' ], 'start', process.argv );
        } catch( e ) {
          __( e );
        }
        
    }
});