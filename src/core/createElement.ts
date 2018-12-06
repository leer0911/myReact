const createElement: preact.createElement = (
  nodeName,
  attributes,
  ...vnode
) => {
  let children = vnode.length ? [].concat(...vnode) : null;
  return { nodeName, attributes, children };
};

export default createElement;
