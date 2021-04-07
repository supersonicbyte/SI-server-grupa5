class Error {
    constructor(error_id, message) {
        this.success = false;
        this.error_id = error_id;
        this.message = message;
    }
}

module.exports.Error = Error;