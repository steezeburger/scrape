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
    startURL      = 'http://www.leafly.com/finder/search?&loadfacets=true&sort=BestMatch&page=0&take=700&searchradius=1679&latitude=35.646162&longitude=-96.59375',
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
        fs.readFile('cache/leaflyMasterList.json', function (err, data) {
          if (err) {
            throw err;
          }

/*        });*/
        /*request( startURL, function (error, response, body) {*/
          try {
            /*var lastCache = fs.writeFile('../../cache/leaflyMasterList.json', data, function (err) {
              if (err) throw err;
              console.log('It\'s saved!');
            });*/
            var dataFile = JSON.parse( data.toString() );
            __( 'LEN',dataFile.Results.length);
            _.each(dataFile.Results, function( value, i, object) {
              // first lets try to parse the address
              __( '@@ NAME: ' );
              __( value.Name );
              __( '@@ ADDRESS: ' );
              __( value.Address1 );
              __( value.City );
              __( value.State );
              __( value.Zip );
              __( value.UrlName );
              __( value.LastMenuUpdate );
              var address2 = ( value.Address2 ) ? value.Address2.toLowerCase() : '';
              var store =  {
                  title: value.Name.toLowerCase(),
                  addressRaw: '',
                  address: {
                      street:         ( value.Address1 ) ? value.Address1.toLowerCase() : '',
                      city:           ( value.City ) ? value.City.toLowerCase() : '',
                      state:          ( value.State ) ? value.State.toLowerCase() : '',
                      zipcode:        ( value.Zip ) ? value.Zip.toLowerCase() : '',
                      lastMenuUpdate: ( value.LastMenuUpdate ) ? value.LastMenuUpdate.toLowerCase() : '',
                  },
                  urls: [
                    { 
                      siteId: config.setting( 'constants' ).LEAFLY,
                      slug:   value.UrlName
                    } // we'll add more if there are more later
                  ]
              }

              // lets see if it's alreay there 
              self.getModel( 'stores' ).find( { title: store.title, city: store.city, state: store.state }, function( err, docs ) {
                if( err ) {
                  throw err;
                }

                if( docs.length ) {
                  // lets add the url array to the new document so they are all carried through
                  docs[ 0 ].urls = docs[ 0 ].urls.concat( store.urls );
                  // it's already an entry, so just update the last updated
                  self.getModel( 'stores' ).update(
                    { _id: docs[ 0 ]._id  },
                    { lastMenuUpdate: docs[ 0 ].lastMenuUpdate },
                    { upsert: false },
                    function ( err, count ) {
                      if( err ) throw err;
                      __('updated', count);
                    }
                  );
                } else {
                  self.getModel( 'stores' ).create( store, function( err, count ) {
                    if( err ) throw err;
                    __('saved', count);
                  });
                }
              });

              /*var dispensary = null;
              dispensary = {
                title: value.Name.toLowerCase(),
              };
              if( dispensary ) {
                self.getModel( 'stores' ).update(
                  {
                    title: dispensary.title.toLowerCase(),
                  },
                  dispensary,
                  { upsert: true },
                  function( err, document ) {
                    if( err ) {
                      __( 'error adding dispensary' );
                    }
                    __( 'added dispensary' );
                  }
                );
              }*/
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
        listCrawler.init( [ 'stores' ], 'start', arg );
    }
});

