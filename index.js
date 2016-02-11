
var pool = require('generic-promise-pool');
var r = require('rethinkdb');


function Database(options) {
  this.pool = pool.create({
    name: 'rethinkdb',
    create: function () {
      return r.connect(options);
    },
    destroy: function (connection) {
      return connection.close();
    }
  });

  this.options = options || {};
  var _this = this;

  objMap(r, function (k, fn) {
    if (typeof fn === 'function') {
      _this[k] = wrapfn(_this, r, fn);
    }

    return fn;
  });

  this.plugins = this.options.plugins || Database.plugins;
}

Database.plugins = [];


function wrapfn(db, receiver, fn) {
  return function () {
    var result = promisify(db, fn.apply(receiver, arguments));

    if (result.run) {
      result.then = function () {
        var promise = result.run();
        return promise.then.apply(promise, arguments);
      };

      // slight hack...?
      if (!db.options.autoToArray) {
        result.toArray = function (callback) {
          var promise = result.then(function (cursor) {
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

    return result;
  };
}


function runfn(db, receiver) {
  return function (options, callback) {
    if (!callback) { callback = options; options = void 0; }

    var promise = db.pool
      .acquire(function (connection) {
        return receiver._run(connection, options);
      })
      .then(function (result) {
        if (result && result.toArray && db.options.autoToArray) {
          return result.toArray();
        } else {
          return result;
        }
      });

    return maybeCallback(promise, callback);
  };
}


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


function promisify(db, receiver) {
  receiver._run = receiver.run;

  objMap(receiver, function (k, fn) {
    if (typeof fn === 'function' && !k.startsWith('_')) {
      if (k === 'run') {
        return runfn(db, receiver);
      } else {
        return wrapfn(db, receiver, fn);
      }
    } else {
      return fn;
    }
  });

  for (var i in db.plugins) {
    db.plugins[i](receiver);
  }

  return receiver;
}


function objMap(obj, fn) {
  for (var k in obj) {
    obj[k] = fn(k, obj[k]);
  }

  return obj;
}

module.exports = Database;
module.exports.r = r;
