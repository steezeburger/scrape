var nodeio = require('node.io');
exports.job = new nodeio.Job({recurse: false}, {
    input: './',
    run: function (full_path) {
        console.log(full_path);
        this.emit();
    }
});