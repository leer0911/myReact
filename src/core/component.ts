import { FORCE_RENDER } from './constants';
import { enqueueRender } from './render-queue';
import { extend } from '../utils';
import { renderComponent } from '../vdom/component';

export default class Component implements preact.Component {
  _dirty = true;
  _renderCallbacks = [];
  context;
  props;
  state;
  prevState;
  constructor(props, context?) {
    this.context = context;
    this.props = props;
    this.state = this.state || {};
  }
  setState(state, callback?) {
    if (!this.prevState) this.prevState = this.state;
    this.state = extend(
      extend({}, this.state),
      typeof state === 'function' ? state(this.state, this.props) : state
    );
    if (callback) this._renderCallbacks.push(callback);
    enqueueRender(this);
  }

  forceUpdate(callback) {
    if (callback) this._renderCallbacks.push(callback);
    renderComponent(this, FORCE_RENDER);
  }

  render() {}
}
