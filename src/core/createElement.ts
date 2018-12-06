const createElement: preact.createElement = (
  nodeName,
  attributes,
  ...vnode
) => {
  const key = attributes ? attributes.key : undefined;
  let children = vnode.length ? [].concat(...vnode) : null;
  return { nodeName, attributes, children, key };
};

export default createElement;
