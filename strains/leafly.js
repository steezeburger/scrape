/*
  * @title:         Get Strain List
  * @author:        Brian Kenny <papaviking@gmail.com>
  * @version:       0.1
  * @description:   This grabs leafy's strain list via their api and stores it
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
    apiURL  = 'http://www.leafly.com/api/strains',
    strains = {
        start: function( _offset ) {
            var self = this;
            summary.errors              = 0,
            summary.critical_errors     = 0,
            summary.success             = 0,
            summary.time_stared         = new Date(),
            summary.time_elapsed        = null,
            summary.dispensaries        = 0;
            request( apiURL, function( error, response, body ) {
                var list   = JSON.parse( body ),
                    length = list.length,
                    at     = 0;
                _.each( list, function( value, i, original ) {
                    var strain = {  
                        name:       value.Name,
                        category:   value.Category,
                        url:        value.Url
                    }
                    self.getModel( 'leafly_strains' ).update(
                        { name: value.Name },
                        strain,
                        { upsert: true },
                        function( err, document ) {
                            if( err ) {
                                __('error writing strain', err);
                            } else {
                                __('written');    
                            }
                            at++;
                            if( at == length ) {    
                                self.endProcess();
                            }
                        }
                    );
                });
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
        strains.init( [ 'leafly_strains' ], 'start', arg );
    }
});