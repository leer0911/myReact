import options from "../config/options";
import { renderComponent } from "../vdom/component";
import { defer } from "../utils";

let dirtyComponents = [];

const enqueueRender = component => {
  if (
    !component._dirty &&
    (component._dirty = true) &&
    dirtyComponents.push(component) === 1
  ) {
    (options.debounceRendering || defer)(rerender);
  }
};

const rerender = () => {
  let p;
  while ((p = dirtyComponents.pop())) {
    if (p._dirty) {
      renderComponent(p);
    }
  }
};

export { enqueueRender, rerender };
