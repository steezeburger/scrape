/**
  * @title:         Process Dispensary List
  * @author:        Brian Kenny <papaviking@gmail.com>
  * @version:       0.1
  * @description:   This crawls through the collection of dispensaries and parses their shit
  *                 
  * @dependencies:  node.io, underscore, request
  **/

var nodeio  = require( 'node.io' ),
    _       = require( 'underscore' ),
    request = require( 'request' ),
    colors  = require( 'colors' ),
    helpers = require( '../../lib/com/ganjazoid/Helpers' ),
    base    = require( '../../lib/com/ganjazoid/ParserBaseClass' ),
    config  = require( '../../app/configs' ),
    __      = console.log,
    summary       = {},
    payloads      = {},
    dispensaries  = [],
    scope         = null,
    dispensaryCrawler = {
      start: function() {
        var self = this;
        summary.errors              = 0,
        summary.critical_errors     = 0,
        summary.success             = 0,
        summary.time_stared         = new Date(),
        summary.time_elapsed        = null,
        summary.regions_parsed      = 0,
        summary.dispensaries_found  = 0,
        summary.sources             = [];

        payloads.dispensaries           = [];
        payloads.dispensaries.completed = 0;
        payloads.dispensaries.expecting = 0;

        self.getPayload();
      },
      getPayload: function() {
        var self = this;
        self.getModel( 'weedmaps_dispensary_urls' ).find({}, function( err, collection ) {
          dispensaries = collection;
          self.pillage();
        });
      },
      pillage: function() {
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
        scope             = this;
        dispensaryCrawler = _.extend( base.create(), dispensaryCrawler );
        dispensaryCrawler.init( [ 'weedmaps_dispensary_urls', 'price' ], 'start', {} );
    }
});