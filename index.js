import diagnostics from 'diagnostics';
import TickTock from 'tick-tock';
import once from 'one-time';

/**
 * Small class that will help with assessing if we've received stale data.
 *
 * @constructor
 * @param {Object} options Configuration.
 * @public
 */
export default class Stale {
  constructor(options = {}) {
    this.previously = null;       // Previously stored data set for comparison.
    this.name = undefined;        // Name of the stale instance.
    this.requests = 6;            // Amount of requests we make to check majority.
    this.interval = 0;            // Fetch interval.

    //
    // Merge options with our defaults.
    //
    Object.keys(options).forEach((key) => {
      this[key] = options[key];
    });

    this.debug = diagnostics(['stale-state', this.name].filter(Boolean).join(':'));
    this.timer = new TickTock(this);

    //
    // The various of callbacks that we use to gather and transfer our checked
    // data to the and from the outside world. They throw by default as we
    // assume that developers set them using an API.
    //
    this.callbacks = {
      compare: () => { throw new Error('Missing compare callback'); },
      request: () => { throw new Error('Missing request callback'); },
      commit: () => { throw new Error('Missing commit callback'); },
      error: () => { /* errors are swallowed by default */ }
    };
  }

  /**
   * Store and commit a new data structure that is seen as correct.
   *
   * @param {Mixed} data New data structure.
   * @private
   */
  save(data) {
    this.debug('received data was accepted, commiting data');

    this.previously = data;
    this.callbacks.commit(data);
  }

  /**
   * Compare if a new piece of data.
   *
   * @param {Mixed} data New data structure.
   * @public
   */
  compare(data) {
    const previously = this.previously;

    this.callbacks.compare(previously, data, {
      accept: once(() => {
        this.save(data);
      }),

      same: once(() => {
        this.debug('the received state was the same, ignoring change');
      }),

      decline: once(() => {
        this.debug('received data was declined, starting verification');

        //
        // We are verifying if our previously declined state is really declined
        // because it's a flux caused by a out of date server response or if the
        // servers are actually all updated with this new state.
        //
        // 1: majority(same) All servers are returning exactly the same result
        //    so this should be seen as the new state.
        //
        // 2: majority(decline) All servers are seeing other out of date
        //    responses. Ignore it for now.
        //
        // 3: majority(accept) Actually the calls are seeing better results now.
        //    So lets initialize a new fetch and attempt to use that as new state.
        //
        //  Unhanded conditions, no majority or consensus has been reached. We
        //  ignore the data change.
        //
        this.verify(previously, (err, results) => {
          if (this.majority(results.same)) {
            this.debug('the results that we got back are the same');
            return;
          }

          if (this.majority(results.decline)) {
            this.debug('majority of the requests are also declining so it must be the new server state');
            return this.save(data);
          }

          if (this.majority(results.accept)) {
            return this.fetch();
          }

          this.debug('received inconsistent server responses, ignoring for now');
        });
      })
    });
  }

  /**
   * We've received some possible stale data from the server. This could have
   * been an intentional rollback of data or an unexpected change so we need
   * to verify that this new state is correct.
   *
   * @param {Mixed} previously Data that need to be compared.
   * @param {Function} next Completion callback.
   * @public
   */
  verify(previously, next) {
    let requested = this.requests;        // Amount of requests we need to make.
    let decline = 0;                      // Amount of requests that incremented.
    let accept = 0;                       // Amount of requests that decremented.
    let same = 0;                         // Data was the same.

    /**
     * Small async iterator that executes the required requests in series. If we
     * do them async it could be that we might be load balanced to the same
     * server that has stale data. By giving the requests some room to breath we
     * do increase the time it takes to resolve the issue but end with a data
     * set that is more reliable in theory.
     *
     * @private
     */
    const again = () => {
      if (!requested) {
        this.debug('verification step complete. %s accept, %s decline, %s same', accept, decline, same);
        return next(undefined, {
          decline: decline,
          accept: accept,
          same: same
        });
      }

      this.debug('starting verification request %s', requested);
      requested--;

      this.callbacks.request((err, data) => {
        if (err) {
          decline++;
          this.debug('received an error while requesting data for verify, marking as incorrect', err);
          return again();
        }

        this.callbacks.compare(previously, data, {
          accept: once(() => {
            accept++;
            again();
          }),

          same: once(() => {
            same++;
            again();
          }),

          decline: once(() => {
            decline++;
            again();
          })
        });
      });
    }

    again();
  }

  /**
   * Manual fetch request that is initiated by developer.
   *
   * @returns {Stale}
   * @public
   */
  fetch() {
    this.callbacks.request((err, data) => {
      if (err) {
        this.debug('received an error while retrieving data', err);
        return this.callbacks.error(err);
      }

      this.compare(data);
    });

    //
    // We are supposed to run at an interval. But it could be that we're called
    // before the interval would be called so we need to cancel it and start
    // again so it fetches again after the specified amount.
    //
    if (this.interval) {
      this.timer
      .clear('interval')
      .setTimeout('interval', this.fetch, this.interval);
    }

    return this;
  }

  /**
   * Test if the supplied amount of votes count as the majority.
   *
   * @param {Number} votes Votes to count.
   * @returns {Boolean} Indication if it's the majority of the votes.
   * @public
   */
  majority(votes) {
    return votes >= (Math.ceil(this.requests / 2) + 1);
  }

  /**
   * Set a callback that does the data comparison.
   *
   * @param {Function} fn Request function.
   * @returns {Stale}
   * @public
   */
  check(fn) {
    this.callbacks.compare = fn;
    return this;
  }

  /**
   * Set a callback that does a request for fetching data.
   *
   * @param {Function} fn Request function.
   * @returns {Stale}
   * @public
   */
  request(fn) {
    this.callbacks.request = fn;
    return this;
  }

  /**
   * Set a callback that receives a validated set of data that is safe for
   * usage.
   *
   * @param {Function} fn Commit function.
   * @returns {Stale}
   * @public
   */
  commit(fn) {
    this.callbacks.commit = fn;
    return this;
  }

  /**
   * Set a callback that receives a validated set of data that is safe for
   * usage.
   *
   * @param {Function} fn Commit function.
   * @returns {Stale}
   * @public
   */
  error(fn) {
    this.callbacks.error = fn;
    return this;
  }
}
