# RethinkPlus

This is a simple wrapper (~130 lines of code) over the standard RethinkDB driver.  It mostly just adds connection pooling.

## Installation

    $ npm install --save rethink-plus


## Usage

First, import the library and instantiate the class.

```js
import RethinkPlus from 'rethink-plus';

let db = new RethinkPlus({
  // standard RethinkDB connection options, e.g.
  database: 'test'
});
```

This will create a connection pool for you.  The instance has all the same methods as `r` would in the normal driver docs.  The only difference is that the `run` method doesn't take a connection anymore: it takes one from the pool.

For example, to get a document with a specific ID:

```js
db
  .table('test')
  .get('07290fa5-1691-430c-a397-111575370881')
  .run(/*..optional options..*/)
  .then(/*...*/);
```

If you don't have any options to pass, you can just skip the call to `run` entirely, and it'll be invoked on `then`.  If you're using `async`/`await` like it's 2016, this leads to quite a natural-feeling usage:

```js
let table = db.table('test');
let doc = await table.get('07290fa5-1691-430c-a397-111575370881');
```

If you wanted to use the callback interface like it was 2014, you could do that too:

```js
db
  .table('test')
  .get('07290fa5-1691-430c-a397-111575370881')
  .run(/*..optional options..*/, function (err, result) {

  });
```

The library exports `r` in case you need it, for filters for example:

```js
import RethinkPlus, {r} from 'rethink-plus';
// ...
let people = db.table('people');
let adults = await people.filter(r.row('age').gt(16));
```


### Cursors

For convenience, there's an extra `toArray()` method.  Without it, if you wanted to get an array of all the documents, you'd have to do something like this:

```js
let cursor = await table;
let docs = await cursor.toArray();
```

However, I've monkey-patched it:

```js
let docs = await table.toArray();
```

If you have no need for cursors in your project, you can instruct the driver to always convert cursors to arrays for you:

```js
let db = new RethinkPlus({/** connection options **/, autoToArray: true});
let docs = await db.table('test');
```


## Plugins

You can pass an array of plugins to the constructor.  A plugin should be a function which possibly modifies its parameter, which is an object.  The plugin functions are called for every function call.

### Example

Let's say you wanted to modify the `filter` function.  You could define a plugin like this:

```js
function filterPlugin(receiver) {
  if (receiver.filter) {
    var _filter = receiver.filter;

    receiver.filter = function () {
      // do something cool...

      // and then:
      return _filter.apply(receiver, arguments);
    };
  }
}
```

This can be used like so:

```js
let db = new RethinkPlus({/** connection options **/, plugins: [filterPlugin]});
```

Or, if you want it to be used for all instances:

```js
RethinkPlus.plugins.push(filterPlugin);

let db = new RethinkPlus({/** connection options **/});
// db will use the filterPlugin
```

## Licence etc

This project is ISC licensed - do whatever you like.  Comments, pull requests, and bug reports are all welcome!  Thanks for your time.
