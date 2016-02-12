
var pool = require('generic-promise-pool');
var r = require('rethinkdb');
var Symbol = require('es6-symbol');

var runSymbol = Symbol('_run');
var stateSymbol = Symbol('state');


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
  this.plugins = this.options.plugins || Database.plugins;

  wrap(this, r, this);
}

Database.plugins = [];
Database.prototype.runSymbol = runSymbol;
Database.prototype.stateSymbol = stateSymbol;


function wrapfn(db, receiver, fn) {
  return function () {
    var result = wrap(db, fn.apply(receiver, arguments));
    result[stateSymbol] = receiver[stateSymbol] || {};

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
        return receiver[runSymbol](connection, options);
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


function wrap(db, receiver, target) {
  if (!target)
    target = receiver;

  if (receiver.run)
    target[runSymbol] = receiver.run;

  objEach(receiver, function (k, fn) {
    if (typeof fn === 'function' && k != runSymbol) {
      if (k === 'run') {
        target[k] = runfn(db, receiver);
      } else {
        target[k] = wrapfn(db, receiver, fn);
      }
    }
  });

  for (var i in db.plugins) {
    db.plugins[i].call(db, receiver);
  }

  return receiver;
}


function objEach(obj, fn) {
  for (var k in obj) {
    fn(k, obj[k]);
  }
}

module.exports = Database;
module.exports.r = r;
