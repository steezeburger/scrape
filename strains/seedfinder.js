/**
  * @title:         Get Strain List Pages
  * @author:        Brian Kenny <papaviking@gmail.com>
  * @version:       0.1
  * @description:   This grabs seedfinder's strain list pages, A through Z
  *                 
  * @dependencies:  node.io, underscore
  **/

  var nodeio  = require( 'node.io' ),
    _       = require( 'underscore' ),
    __      = console.log,
    request = require( 'request' ),
    colors  = require( 'colors' ),
    helpers = require( '../lib/com/ganjazoid/Helpers' ),
    base    = require( '../lib/com/ganjazoid/ParserBaseClass' ),
    config  = require( '../app/configs' ),
    scope   = {},
    summary = {},
    apiURL  = 'http://en.seedfinder.eu/database/strains/alphabetical/%TOKEN%/',
    alpha   = 'abcdefghijklmnopqrstuvwxyz',
    urls    = [],
    payloads = {},
    strains = {
        start: function( _offset ) {
            var self = this;
            urls.push( apiURL.replace( '%TOKEN%', '0123456789' ) );
            _.each( alpha.split(''), function( value, i, original ) {
                urls.push( apiURL.replace( '%TOKEN%', value ) );
            });
            summary.errors              = 0,
            summary.critical_errors     = 0,
            summary.success             = 0,
            summary.time_stared         = new Date(),
            summary.time_elapsed        = null,
            summary.dispensaries        = 0;
            payloads = new self.loader();
            payloads.init( 'seedfinder_strains' );
            payloads.set( 'seedfinder_strains', urls.length );
            self.getPage();

        },
        getPage: function() {
            var self = this;
            __('fetching', urls[ payloads.cur( 'seedfinder_strains' ) ] );
            scope.getHtml( urls[ payloads.cur( 'seedfinder_strains' ) ], function( err, $ ) {
                __( 'completed download '.green, urls[ payloads.cur( 'seedfinder_strains' )] );
                var nodes   = $( '.SeedTable .hell .xs1 a' );


                _.each( nodes, function( value, i, object ) {
                    var strain  = {  
                        name:       nodes[ i ].children[0].raw,
                        category:   '',
                        url:        nodes[ i ].attribs.href.replace( '../../../', '' )
                    };
                    self.getModel( 'seedfinder_strains' ).update(
                        strain,
                        strain,
                        { upsert: true },
                        function( err,  document ) {
                            if( err ) {
                                __( 'write error ', err )
                            }
                            
                        }
                    );
                });
                if( err ) {
                    __( 'error', err );
                }
                payloads.tick( 'seedfinder_strains' );
                if( payloads.met( 'seedfinder_strains' ) ) {
                    self.endProcess();
                } else {
                    self.getPage();
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
        strains = _.extend( base.create(), strains );
        strains.listen( strains.constants.COMPLETE, function( msg ) {
            scope.emit( msg  );
        });
        strains.init( [ 'seedfinder_strains' ], 'start', arg );
    }
});