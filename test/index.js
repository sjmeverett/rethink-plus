
var expect = require('chai').expect;
var RethinkPlus = require('../index.js');
var r = RethinkPlus.r;


describe('RethinkPlus', function () {
  var db;
  this.timeout(3000);

  before(function () {
    db = new RethinkPlus({db: 'testrethinkplus'});

    return db.dbList()
      .then(function (dbs) {
        if (dbs.indexOf('testrethinkplus') === -1) {
          return db.dbCreate('testrethinkplus');
        }
      })
      .then(function () {
        return db.tableList();
      })
      .then(function (tables) {
        if (tables.indexOf('test') === -1) {
          return db.tableCreate('test');
        }
      });
  });

  afterEach(function () {
    return db.table('test').delete();
  });

  it('should work with promises', function () {
    var table = db.table('test');

    return table
      .insert({
        a: '1'
      })
      .then(function (result) {
        expect(result.generated_keys).to.exist;
        expect(result.generated_keys[0]).to.exist;
        return table.get(result.generated_keys[0]);
      })
      .then(function (result) {
        expect(result.a).to.equal('1');
      });
  });


  it('should work with callbacks', function (done) {
    var table = db.table('test');

    table
      .insert({
        a: '1'
      })
      .run(function (err, result) {
        if (err) return done(err);

        expect(result.generated_keys).to.exist;
        expect(result.generated_keys[0]).to.exist;

        table.get(result.generated_keys[0]).run(function (err, result) {
          if (err) return done(err);
          expect(result.a).to.equal('1');
          done();
        });
      });
  });


  it('should auto convert cursors if requested', function () {
    db = new RethinkPlus({db: 'testrethinkplus', autoToArray: true});
    var table = db.table('test');

    return table
      .insert([
        {a: 1},
        {b: 2}
      ])
      .then(function () {
        return table;
      })
      .then(function (docs) {
        expect(docs).to.have.length(2);
      });
  });


  it('let\'s try a filter', function () {
    db = new RethinkPlus({db: 'testrethinkplus', autoToArray: true});
    var table = db.table('test');

    return table
      .insert([
        {a: 1},
        {a: 2},
        {a: 3}
      ])
      .then(function () {
        return table.filter(r.row('a').gt(2));
      })
      .then(function (docs) {
        expect(docs).to.have.length(1);
      });
  });
});
