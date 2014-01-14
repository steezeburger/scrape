/**
    * @title:         Opens terminal windows on OSX.
    * @author:        Brian Kenny <papaviking@gmail.com>
    * @version:       0.0
    * @description:   DESCRIPTION
    *                 
    * @dependencies:  
    **/

var nodeio  = require( '../node_modules/node.io' ),
    _       = require( '../node_modules/underscore' ),
    request = require( '../node_modules/request' ),
    colors  = require( '../node_modules/colors' ),
    jquery  = require( '../node_modules/jquery' ),
    helpers = require( '../lib/com/ganjazoid/Helpers' ),
    base    = require( '../lib/com/ganjazoid/ParserBaseClass' ),
    config  = require( '../app/configs' ),
    sys     = require('sys'),
    exec    = require('child_process').exec,
    child,
    __      = console.log; //function() {},
    summary = {},
    scope   = this,
    siteSchema = {
        stickyguide: { list: 'stickyguide_dispensary',   id: 1 },
        leafly:      { list: 'leafly_dispensary_urls',   id: 2 },
        weedmaps:    { list: 'weedmaps_dispensary_urls', id: 3 },
        cleaner:     { list: 'items',                    id: false }
    }
    batchSize = 1000;
    count   = 0,
    moduleName = {
        start: function() {
            var self = this;
            summary.errors                 = 0,
            summary.critical_errors        = 0,
            summary.success                = 0,
            summary.time_stared            = new Date(),
            summary.time_elapsed           = null;

            var siteToGrab  = ( siteSchema[ self.whichSite ].id ) ? siteSchema[ self.whichSite ].id : null;
            batchSize       = ( self.batch ) ? self.batch : batchSize;

            __( 'siteToGrab', siteToGrab );
            __( 'batchSize ',batchSize );
            __( siteSchema[ self.whichSite ].list );

            self.getModel( siteSchema[ self.whichSite ].list ).find( {}, null, null, function( err, docs ) {
                if( err ) {
                    __( 'err', err );
                }
                count = ( self.whichSite === 'stickyguide' ) ? docs.length * 7 : docs.length;
                self.printCount( count );
            });
        },
        printCount: function( count ) {
            var self = this;
            var loops = count / batchSize,
                start, 
                end;

            if( count == 0 ) {
                __( 'no count' );
                self.endProcess( 'no count' );
            }

            for( var i = 0; i < loops; i ++ ) {

                start = batchSize * i;
                end   = start + batchSize;

                if( end > count ) {
                    end = count;
                }

                //child = exec( 'echo '+start+' '+end, function (error, stdout, stderr) {
                var cmd = 'cd exec && pwd && ./'+siteSchema[ self.whichSite ].list+'.sh '+' '+start+' '+end;
                child = exec( cmd, function (error, stdout, stderr) {
                    sys.print( stdout );
                    if (error !== null) {
                        console.log('exec error: ' + error);
                    }
                });

            }
        }
    }


moduleName = _.extend( base.create(), moduleName );
moduleName.listen( moduleName.constants.COMPLETE, function( msg ) {
  process.exit( msg );
});

moduleName.init( [ 'weedmaps_dispensary_urls', 'leafly_dispensary_urls', 'stickyguide_dispensary' ], 'start', process.argv );