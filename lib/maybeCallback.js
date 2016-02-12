
function maybeCallback(promise, callback) {
  if (callback) {
    promise
      .then(
        function (result) {
          callback(null, result);
        },
        function (error) {
          callback(error);
        }
      );

  } else {
    return promise;
  }
}

module.exports = maybeCallback;
