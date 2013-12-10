var nodeio = require( 'node.io' );

var options = {
	timeout: 10, // seconds
	max: 20, // threads
	retries: 3
};

exports.job = new nodeio.Job( options, {
	run: function( line ) {
		console.log( this.options.args );

	},
	fail: function( input, status ) {
		this.emit( 'thread failed' );
	}
});