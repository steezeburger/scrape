var nodeio = require('node.io');
exports.job = new nodeio.Job({
	input: function() {
		this.inputStream( read_stream );
	 	this.input.apply( this, arguments );
	},
	run: function( line ) {
		this.emit( line );
	},
	output: function() {
		write_stream.write( lines.join( '\n' ) );
	}
});