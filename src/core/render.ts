import { diff } from '../vdom/diff';

const render: preact.render = (vnode, parent, merge) => {
  return diff(merge, vnode, {}, false, parent, false);
};

export default render;
