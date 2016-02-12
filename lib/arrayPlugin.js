
var maybeCallback = require('./maybeCallback');


function arrayPlugin(receiver) {
  receiver.first = makeArrayFn('first', false, false);
  receiver.firstOrDefault = makeArrayFn('firstOrDefault', false, true);
  receiver.single = makeArrayFn('single', true, false);
  receiver.singleOrDefault = makeArrayFn('singleOrDefault', true, true);

  if (!this.options.autoToArray) {
    receiver.toArray = function (callback) {
      var promise = receiver.then(function (cursor) {
        if (cursor && cursor.toArray) {
          return cursor.toArray();
        } else {
          throw new Error('called toArray() on a non-cursor');
        }
      });

      return maybeCallback(promise, callback);
    };
  }
}


function makeArrayFn(name, single, returnDefault) {
  return function (defaultValue, callback) {
    if (!callback)
      callback = defaultValue;

    var promise = this
      .then(function (cursor) {
        if (Array.isArray(cursor)) {
          return cursor;
        } else if (cursor.toArray) {
          return cursor.toArray();
        } else {
          throw new Error(name + '() called on a non-cursor');
        }
      })
      .then(function (array) {
        if (single && array.length > 1) {
          throw new Error('no more than one element expected')
        } else if (!returnDefault && array.length < 1) {
          throw new Error('expected at least one element');
        }

        return array[0] || defaultValue;
      });

    return maybeCallback(promise, callback);
  };
}

module.exports = arrayPlugin;
