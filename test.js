import assume from 'assume';
import Stale from './';

describe('stale-state', function () {
  let stale;

  beforeEach(function () {
    stale = new Stale({
      requests: 6
    });
  });

  it('can be constructed without options', function () {
    stale = new Stale();
  });

  describe('.prevously', function () {
    it('does not have any previous datat stored', function () {
      assume(stale.previously).is.a('null');
    });

    it('can set the previously set data', function () {
      stale = new Stale({ previously: 'what' });

      assume(stale.previously).equals('what');
    });
  });

  describe('#majority', function () {
    it('correctly checks if the passed in value in a majority', function () {
      assume(stale.majority(1)).is.false();
      assume(stale.majority(2)).is.false();
      assume(stale.majority(3)).is.false();
      assume(stale.majority(4)).is.true();
      assume(stale.majority(5)).is.true();
      assume(stale.majority(6)).is.true();
      assume(stale.majority(7)).is.true();
    });
  });

  describe('#save', function () {
    it('calls the commit function with the data', function (next) {
      stale.commit(function (data) {
        assume(data).equals('foobar');
        next();
      });

      stale.save('foobar');
    });

    it('it saves the stored data as previously', function () {
      stale.commit(function () {});
      stale.save('waddup');

      assume(stale.previously).equals('waddup');
    });

    it('throw if theres no commit function', function (next) {
      try { stale.save('what'); }
      catch (e) { next(); }
    });
  });

  describe('#verify', function () {
    it('calls #requested for the amount of requests', function (done) {
      done = assume.wait(7, done);

      stale.check(function (previous, currently, state) {
        if (currently.data === previous.data) return state.same();
        if (currently.data > previous.data) return state.accept();

        state.decline();
      });

      stale.request(function (next) {
        setTimeout(function () {
          next(undefined, { data: 1 });
          done();
        }, 0);
      });

      stale.verify({ data: 0 }, function (err, results) {
        assume(results).is.a('object');
        assume(results.accept).equals(6);

        done();
      });
    });

    it('can flag as same', function (next) {
      stale.check(function (previous, currently, state) {
        if (currently.data === previous.data) return state.same();
        if (currently.data > previous.data) return state.accept();

        state.decline();
      });

      stale.request(function (next) {
        setTimeout(function () {
          next(undefined, { data: -1 });
        }, 0);
      });

      stale.verify({ data: 0 }, function (err, results) {
        assume(results).is.a('object');
        assume(results.decline).equals(6);
        next();
      });
    })

    it('can decline the data', function (next) {
      stale.check(function (previous, currently, state) {
        if (currently.data === previous.data) return state.same();
        if (currently.data > previous.data) return state.accept();

        state.decline();
      });

      stale.request(function (next) {
        setTimeout(function () {
          next(undefined, { data: -1 });
        }, 0);
      });

      stale.verify({ data: 0 }, function (err, results) {
        assume(results).is.a('object');
        assume(results.decline).equals(6);
        next();
      });
    });
  });

  describe('#compare', function () {
    describe('.accept', function () {
      it('saves the data', function (next) {
        stale.previously = { value: 8 };

        stale.commit(function (data) {
          assume(data.value).equals(9);
          next();
        });

        stale.check(function (previously, current, state) {
          if (previously.value < current.value) state.accept();
          else state.decline();
        });

        stale.compare({ value: 9 });
      });
    });

    describe('.decline', function () {
      it('accepts the declined data if the server returns it consistently', function (next) {
        stale.previously = { value: 8 };

        stale.commit(function (data) {
          assume(data.value).equals(5);
          next();
        });

        stale.check(function (previously, current, state) {
          if (previously.value === current.value) return state.same();

          if (previously.value < current.value) state.accept();
          else state.decline();
        });

        stale.request((next) => {
          next(undefined, { value: 5 });
        });

        stale.fetch();
      });
    });

    describe('.same', function () {
      it('does not trigger a commit', function () {
        stale.previously = { value: 8 };

        stale.commit(function (data) {
          throw new Error('I should no commit changes as data is the same');
        });

        stale.check(function (previously, current, state) {
          if (previously.value === current.value) return state.same();
          if (previously.value < current.value) return state.accept();

          state.decline();
        });

        stale.compare({ value: 8 });
      });
    });

    it('correctly handles a stale server response', function () {
      const responses = [{ value: 9 }, { value: 8 }, { value: 9 }, { value: 8 }, { value: 9}, { value: 9 }, { value: 9 }, { value: 9}, { value: 9} ];
      stale.previously = { value: 8 };

      stale.commit(function (data) {
        assume(data.value).equals(9);
      });

      stale.check(function (previously, current, state) {
        if (previously.value === current.value) return state.same();
        if (previously.value < current.value) return state.accept();

        state.decline();
      });

      stale.request((next) => {
        next(undefined, responses.shift());
      });

      stale.fetch();
    });
  });

  describe('#fetch', function () {
    it('calls the request method', function (next) {
      stale.request(() => {
        next();
      });

      stale.fetch();
    });

    it('compares and commits the result', function (next) {
      next = assume.plan(2, next);

      stale
      .commit((data) => {
        assume(data).equals(100);
        next();
      })
      .check((prev, next, state) => {
        assume(next).equals(100);
        state.accept();
      });

      stale.request((next) => {
        next(undefined, 100)
      });

      stale.fetch();
    });

    it('triggers error calback on request failure', function (next) {
      stale.error((err) => {
        assume(err.message).equals('testing onerror');
        next();
      });

      stale.request((next) => {
        next(new Error('testing onerror'));
      });

      stale.fetch();
    });

    it('calls fetch automatically at an interval after first call', function (done) {
      stale = new Stale({ interval: 10 });
      stale.commit((data) => {
        assume(data).is.a('number');
      })
      .check((prev, next, state) => {
        assume(next).is.a('number');
        state.accept();
      });

      const start = Date.now();
      let calls = 0;

      stale.request((next) => {
        calls++;

        next(undefined, calls);

        if (calls === 4) {
          stale.timer.clear('interval');

          assume((Date.now() - start)/ 4).is.between(8, 12);
          done();
        }
      });

      stale.fetch();
    });
  });

  describe('#error', function () {
    it('stores the error handler', function () {
      const test = () => {};
      stale.error(test);

      assume(stale.callbacks.error).equals(test);
    });

    it('returns self', function () {
      const test = () => {};
      assume(stale.error(test)).equals(stale);
    });
  });

  describe('#commit', function () {
    it('stores the commit handler', function () {
      const test = () => {};
      stale.commit(test);

      assume(stale.callbacks.commit).equals(test);
    });

    it('returns self', function () {
      const test = () => {};
      assume(stale.commit(test)).equals(stale);
    });
  });

  describe('#check', function () {
    it('stores the compare handler', function () {
      const test = () => {};
      stale.check(test);

      assume(stale.callbacks.compare).equals(test);
    });

    it('returns self', function () {
      const test = () => {};
      assume(stale.check(test)).equals(stale);
    });
  });

  describe('#request', function () {
    it('stores the request handler', function () {
      const test = () => {};
      stale.request(test);

      assume(stale.callbacks.request).equals(test);
    });

    it('returns self', function () {
      const test = () => {};
      assume(stale.request(test)).equals(stale);
    });
  });
});
