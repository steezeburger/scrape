var nodeio = require('node.io');
exports.job = new nodeio.Job({
	input: function( start, num, callback ) {
		
	},
	run: function( row ) {
		this.emit( row );
	},
	output: function( rows ) {
		// multiple rows as array
		// 
	}
});