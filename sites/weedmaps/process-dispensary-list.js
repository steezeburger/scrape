
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
      start: function( _offset ) {
        var self = this;

        summary.errors                 = 0,
        summary.critical_errors        = 0,
        summary.success                = 0,
        summary.time_stared            = new Date(),
        summary.time_elapsed           = null,
        summary.dispensaries_processed = 0,
        summary.menu_items             = 0;

        if( _offset ) {
          offset = _offset;
        }

        payloads = new self.loader();
        payloads.init( 'weedmaps_dispensary_urls' );
        payloads.init( 'prices' );
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
          __( dispensaries.length );
          payloads.set( 'weedmaps_dispensary_urls', dispensaries.length );
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
          payloads.set( 'prices', ( payloads.cur( 'prices' ) + (items.length-1) ) );
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
                    title: honeypot.name,
                    source: 'weedmaps',
                    type: category,
                    prices: [
                        { 
                          price: honeypot.price_eighth,
                          unit: "eighth"
                        },
                        { 
                          price: honeypot.price_gram,
                          unit: "gram"
                        },
                        { 
                          price: honeypot.price_half_gram,
                          unit: "half-gram"
                        },
                        { 
                          price: honeypot.price_half_ounce,
                          unit: "half-ounce"
                        },
                        { 
                          price: honeypot.price_ounce,
                          unit: "ounce"
                        },
                        { 
                          price: honeypot.price_quarter,
                          unit: "quarter"
                        },
                        { 
                          price: honeypot.price_unit,
                          unit: "unit"
                        }
                    ],
                    meta: [
                        {
                          key: "updated_at",
                          value: honeypot.updated_at
                        },
                        {
                          key: "strain_id",
                          value: honeypot.strain_id
                        },
                        {
                          key: "id",
                          value: honeypot.id
                        },
                        {
                          key: "image",
                          value: honeypot.image.url
                        },
                        {
                          key: "dispensary_id",
                          value: honeypot.dispensary_id
                        }
                    ],
                    createdAt: new Date()
                  };
                  self.getModel( 'price' ).create( price, function( err, savedItem ) {
                    if( err ) {
                      __( 'save error'.red , err );
                      summary.errors++;
                    } else {
                      summary.menu_items++;
                    }
                    payloads.tick( 'prices' );
                  });
            } else {
              payloads.tick( 'prices' );
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
            __( 'price payload'.yellow,     payloads.cur( 'prices' ),                   payloads.total( 'prices' ) );
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
        var arg = null;
        if( process.argv.length > 4 ) {
          arg =  process.argv[ 4 ];
        }

        dispensaryCrawler = _.extend( base.create(), dispensaryCrawler );
        dispensaryCrawler.listen( dispensaryCrawler.constants.COMPLETE, function( msg ) {
            scope.emit( msg  );
        });
        dispensaryCrawler.init( [ 'weedmaps_dispensary_urls', 'price' ], 'start', arg );
    }
});