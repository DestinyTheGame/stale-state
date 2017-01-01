# stale-state

## Install

```
npm install --save stale-state
```

## API

```js
import StaleState from 'stale-state';
const stale = new StaleState({ /* options here */ });
```

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
