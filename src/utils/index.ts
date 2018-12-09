const extend = (obj, props) => {
  for (let i in props) obj[i] = props[i];
  return obj;
};

const applyRef = (ref, value) => {
  if (ref != null) {
    if (typeof ref == "function") ref(value);
    else ref.current = value;
  }
};

const flatten = arr => {
  return arr.reduce((prev, next) => {
    return prev.concat(Array.isArray(next) ? flatten(next) : next);
  }, []);
};

const defer =
  typeof Promise == "function"
    ? Promise.resolve().then.bind(Promise.resolve())
    : setTimeout;

export { extend, applyRef, defer, flatten };
