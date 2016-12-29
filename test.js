import assume from 'assume';
import Stale from './';

describe('stale-state', function () {
  let stale;

  beforeEach(function () {
    stale = new Stale({
      requests: 6
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
