
var arrayPlugin = require('./lib/arrayPlugin');
var maybeCallback = require('./lib/maybeCallback');
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
  this.plugins = [];
  this.plugins.push.apply(this.plugins, Database.plugins);

  if (this.options.plugins)
    this.plugins.push.apply(this.plugins, options.plugins);

  wrap(this, r, this);
}


Database.plugins = [arrayPlugin];
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
