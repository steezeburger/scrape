  /**
    * @title:         MODULE LIST
    * @author:        Brian Kenny <papaviking@gmail.com>
    * @version:       0.0
    * @description:   DESCRIPTION
    *                 
    * @dependencies:  
    **/

var nodeio   = require( 'node.io' ),
    _        = require( 'underscore' ),
    request  = require( 'request' ),
    colors   = require( 'colors' ),
    jquery   = require( 'jquery' ),
    helpers  = require( '../lib/com/ganjazoid/Helpers' ),
    base     = require( '../lib/com/ganjazoid/ParserBaseClass' ),
    config   = require( '../app/configs' ),
    dateUtil = require( 'date-utils' ),
    __       = console.log,
    summary  = {},
    scope    = this,
    //.toISOString()
    Queue = {

		start: function() {
			var self = this;
			summary.errors                 = 0,
	        summary.critical_errors        = 0,
	        summary.success                = 0,
	        summary.time_stared            = new Date(),
	        summary.time_elapsed           = null;
            var today = Date.today(),
                tomorrow = Date.tomorrow(),
                yesterday = Date.yesterday();
            __(today.toISOString(),tomorrow,yesterday);
		},
        isComplete: function() {
            var self = this;
            self.getModel( 'job_queue' ).find({}, function() {

            });
        },
    };


Queue = _.extend( base.create(), Queue );
Queue.listen( Queue.constants.COMPLETE, function() {
  process.exit( 0 );
});

Queue.init( [ 'job_queue' ], 'start', process.argv );  

exports.queue = function() {
    return Queue;
}


/* FOR NODE IO USE DEEZ ONE!

// RUNNER
exports.job = new nodeio.Job({
    timeout: 240,   // process life max
    retries: 3,     //
    max: 120        // threads max
},
{
    input: false,
    run: function() {
        moduleName = _.extend( base.create(), moduleName );        
        moduleName.listen( moduleName.constants.COMPLETE, function( msg ) {
            scope.emit( msg );
        });
        moduleName.init( [], 'start', process.argv );
    }
});
*/
