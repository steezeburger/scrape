exports.trim = function( subject ) {
	return subject.replace(/^[\r\n]+|\.|[\r\n]+$/g, "");
}

exports.decodeHTMLEntities = function( str ) {
    if(str && typeof str === 'string') {
      // strip script/html tags
      str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
      str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
    }
    return str;
}

exports.encodeHTML = function ( subject ) {
    return subject.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&apos;');
};

exports.decodeHTML = function( subject ) {
    return subject.replace(/&apos;/g, "'")
                  .replace(/&quot;/g, '"')
                  .replace(/&gt;/g, '>')
                  .replace(/&lt;/g, '<')
                  .replace(/&amp;/g, '&');
};