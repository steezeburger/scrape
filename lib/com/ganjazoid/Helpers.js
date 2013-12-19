exports.trim = function( subject ) {
	return subject.replace(/^[\r\n]+|\.|[\r\n]+$/g, "");
}