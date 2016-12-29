import Stale from 'stale-state';
import React from 'react';

export default class Example extend React.Component {
  constructor() {
    this.stale = new Stale();

    this.stale.request((receiver) {
      request('https://github.com', (err, res, data) {
        receiver(err, data);
      });
    });

    this.stale.examine((data, done) {

    });

    this.stale.commit((data) => {
      this.setState({ trials: data });
    });

    this.stale.fetch();
  }
}

const stale = new Stale();
