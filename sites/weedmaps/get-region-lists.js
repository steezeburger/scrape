/**
  * @title:         Get Region List
  * @author:        Brian Kenny <papaviking@gmail.com>
  * @version:       0.1
  * @description:   This module scrapes the fixed menu from weedmaps and finds all regions and their sub region urls. 
  *                 This list will provide a master list of all the dispensary listing urls we need to srape in another 
  *                 process
  *                 
  *                 
  * @dependencies:  node.io, underscore, request
  **/

var nodeio          = require( 'node.io' ),
    _               = require( 'underscore' ),
    request         = require( 'request' ),
    colors          = require( 'colors' ),
    helpers         = require( '../../lib/com/ganjazoid/Helpers' ),
    base            = require( '../../lib/com/ganjazoid/ParserBaseClass' ),
    config          = require( '../../app/configs' ),
    summary         = {},
    payloads        = {},
    startURL        = 'https://www.weedmaps.com/',
    __              = console.log,
    selectors       = {
        regionNav: ['.sr1',
                    '.sr2',
                    '.sr3',
                    '.sr4',
                    '.sr5',
                    '.sr6',
                    '.sr7',
                    '.sr8',
                    '.sr9',
                    '.sr10',
                    '.sr11'
                   ],           // anchor
        regionsList: '#regionmenu li',      // gets list of outer regions
        subRegions: '.sub li' // each list item will have 
    }
    scope       = null,
    dispensaryController = {
        start: function() {
            var self = this;
            // init summary
            summary.errors              = 0,
            summary.critical_errors     = 0,
            summary.success             = 0,
            summary.time_stared         = new Date(),
            summary.time_elapsed        = null,
            summary.regions_parsed      = 0,
            summary.dispensaries_found  = 0,
            summary.sources             = [];
            // init payloads
            payloads.dispensaries       = [];

            __( 'start' );
            var fullList        = [],
                dispensaries    = [];
            // get starting HTML
            scope.getHtml( startURL, function( err, $ ) {
                _.each( selectors.regionNav, function( value, iterator, object ) {
                    var curList     = $( value );
                    try { // dirty!
                        if( curList.length ) {
                            // this is a hack for sr8 dupe and the limit of selectors in this library
                            _.each( curList, function( _value, _iterator , _object ) {
                                fullList.push({
                                    name: _value.children[0].children[0].raw,
                                    stub:  _value.children[1]
                                });
                                summary.regions_parsed++;
                            });
                        } else {
                            fullList.push({
                                name: curList.children[0].children[0].raw,
                                stub:  curList.children[1]
                            });
                            summary.regions_parsed++;
                        }
                    } catch( e ) {
                        __( e );
                    }
                });

                _.each( fullList, function( value, iterator, object) {
                    _.each( $('li a', value.stub ) , function( _value, _iterator, _object ) {
                        var name, url;
                        if( '#' !== _value.attribs.href ) {
                            dispensaries.push({
                                name : _value.children[0].raw,
                                url  : _value.attribs.href
                            });
                        }
                    });
                });
                
                // is it a title?
                /*
                _.each( dispensaries, functions( value, i, original ) {
                    if( value ) {

                    }
                });
                */
                
                if( dispensaries.length ) {
                    var regions = self.getModel( 'weedmaps_region' );

                    regions.remove( function( err ) {
                        _.each( dispensaries, function(value, i , object) {
                            regions.update(
                                value,
                                value,
                                { upsert: true },
                                function( err, updated ) {
                                    if( err ) {
                                        __( err );
                                    }
                                    __( updated );
                                }
                            );
                        });
                    });

                }

                /*scope.emit();*/
                //payloads.dispensaries = dispensaries.length;
                //self.scrapeRegions();
            });
        },
        scrapeRegions: function() {
            var self = this;


            
        }
    };

exports.job = new nodeio.Job({
    timeout: 240,   // process life max
    retries: 3,     //
    max: 120        // threads max
},{
    input: false,
    run: function() {
        scope                = this;
        dispensaryController = _.extend( base.create(), dispensaryController );
        dispensaryController.init( [ 'weedmaps_region' ], 'start', [] );
    }
});