# stale-state

A helper library to deal with servers that occasionally return stale data as a
response. This can be problematic if you use the server state to update a UI and
it switches between old and new state.

## Install

The module is released in to the public npm registry and can be installed using:

```
npm install --save stale-state
```

## API

```js
import StaleState from 'stale-state';
const stale = new StaleState({ /* options here */ });
```

The following options are accepted:

- `previously` Allows you to set an initial state.
- `name` Name of the instance. Used in our debug output.
- `requests` The amount of `requests` need to be made to validate if declined
  data is really out of data.
- `interval` Interval for the `fetch` function.

### request

Add a function that does the request for data that might need a verification.
The supplied function receives a single argument which is an error first
completion callback.

```js
stale.request((next) => {
  your.api.call(data, function (err, data) {
    next(err, data);
  });
});
```

### check

This is *the* most important API in this module, the part where *you* verify if
the received data is stale or not and decline or accept the new data. The
supplied method receives 3 arguments:

- `previously` The previous data that we received.
- `currently` The new data that we received from your `request` method.
- `state` An object with an `accept`, `same` and `decline` function to accept or
  decline the newly requested data.

```js
stale.check((previous, current, state) => {
  if (previous.value == current.value) return state.same();
  if (previous.value < currrent.value) return state.accept();

  state.decline();
});
```

### fetch

Start fetching data. This calls the `request` method and starts processing the
data using the `check` method. If an interval is set in the options it will also
start a new interval so your data will be fetched continuously if you need to
poll a specific endpoint.

```js
stale.fetch();
```

### commit

We've found a new accepted state that can be used in your application. This
function receives the newly checked data.

```js
stale.commit((data) => {
  application.setState(data);
});
```

### error

Receives all errors that happen during checking. For example your `request`
method is now calling the callback with errors etc.

```js
stale.error((err) => {
  console.error(err);
});
```

## License

MIT
