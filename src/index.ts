import Component from './core/component';
import options from './config/options';
import render from './core/render';
import { rerender } from './core/render-queue';
import { cloneElement } from './core/clone-element';
import h, { h as createElement } from './core/h';

function createRef() {
  return {};
}
export default {
  h,
  createElement,
  cloneElement,
  createRef,
  Component,
  render,
  rerender,
  options
};

export {
  h,
  createElement,
  cloneElement,
  createRef,
  Component,
  render,
  rerender,
  options
};
