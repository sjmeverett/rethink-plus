
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
}


function wrapfn(db, receiver, fn) {
  return function () {
    var result = promisify(db, fn.apply(receiver, arguments));

    if (result.run) {
      result.then = function () {
        var p = db.pool
          .acquire(function (connection) {
            return result.run(connection);
          })
          .then(function (result) {
            if (result && result.toArray && db.options.autoToArray) {
              return result.toArray();
            } else {
              return result;
            }
          });

        return p.then.apply(p, arguments);
      };
    }

    return result;
  };
}


function promisify(db, receiver) {
  return objMap(receiver, function (k, fn) {
    if (k !== 'run' && typeof fn === 'function') {
      return wrapfn(db, receiver, fn);
    } else {
      return fn;
    }
  });
}


function objMap(obj, fn) {
  for (var k in obj) {
    obj[k] = fn(k, obj[k]);
  }

  return obj;
}

module.exports = Database;
module.exports.r = r;
