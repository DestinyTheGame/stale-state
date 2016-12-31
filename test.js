import assume from 'assume';
import Stale from './';

describe('stale-state', function () {
  let stale;

  beforeEach(function () {
    stale = new Stale({
      requests: 6
    });
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
        if (currently.data > previous.data) state.accept();
        else state.decline();
      });

      stale.request(function (next) {
        setTimeout(function () {
          next(undefined, { data: 1 });
          done();
        }, 0);
      });

      stale.verify({ data: 0 }, function (err, correct) {
        assume(correct).is.true();
        done();
      });
    });

    it('can decline the data', function (next) {
      stale.check(function (previous, currently, state) {
        if (currently.data > previous.data) state.accept();
        else state.decline();
      });

      stale.request(function (next) {
        setTimeout(function () {
          next(undefined, { data: 0 });
        }, 0);
      });

      stale.verify({ data: 0 }, function (err, correct) {
        assume(correct).is.false();
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
      it('starts the verify process');
      it('stores the data when verify process results in allowed');
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
