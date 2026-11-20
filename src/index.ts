// Browser SDK entry point. Consumers provide the suggestion markup.
import { attachNepalipi } from './browser/controller.js';
import { attachCaretPopup, getCaretRect } from './browser/caret-popup.js';

import type { InputField, SpellingHints, SuggestionState } from './browser/types.js';
export type { InputField, SpellingHints, Suggestion, SuggestionState } from './browser/types.js';

type Core = ReturnType<typeof attachNepalipi>;
type Target = Element | string;
type ErrorCode = 'DROPDOWN_RENDER_FAILED' | 'SUBSCRIBER_FAILED';
type ErrorHandler = (error: unknown, info: { code: ErrorCode; target: InputField }) => void;
type Cleanup = () => void;
type Position = 'caret' | 'manual';
type Render = (state: SuggestionState, context: { container: HTMLElement; controller: NepaliPiController }) => void | Cleanup;

export interface DropdownOptions {
  container: HTMLElement | string;
  render: Render;
  position?: Position;
}

export interface NepaliPiOptions {
  enabled?: boolean;
  numberShortcuts?: boolean;
  hints?: SpellingHints;
  dropdown?: DropdownOptions | false | null;
  onError?: ErrorHandler | null;
}

export type NepaliPiUpdate = Omit<NepaliPiOptions, 'dropdown'> & { dropdown?: Partial<DropdownOptions> | false | null };

export interface NepaliPiController extends Pick<Core, 'getState' | 'open' | 'dismiss' | 'choose' |
  'highlight' | 'getInputAttributes' | 'getListAttributes' | 'getOptionAttributes' | 'destroy'> {
  target: InputField;
  subscribe(listener: (state: SuggestionState) => void): Cleanup;
  getCaretRect(): ReturnType<typeof getCaretRect>;
  enable(): NepaliPiController;
  disable(): NepaliPiController;
  setHints(hints: SpellingHints): NepaliPiController;
  update(changes: NepaliPiUpdate): NepaliPiController;
  dropdown: {
    readonly element: HTMLElement | null;
    open(): boolean;
    close(): void;
    update(changes: Partial<DropdownOptions> | false | null): NepaliPiController;
    reposition(): void;
  };
}

type DropdownConfig = { container: HTMLElement; position: Position; render: Render };
type Binding = { element: HTMLElement; reposition(): void; destroy(): void };
type Hooks = { invoke<T>(callback: () => T): T; failed(binding: Binding, error: unknown): void };

declare global {
  interface Window {
    NepaliPi?: typeof NepaliPi;
  }
}

const instances = new WeakMap<Element, NepaliPiController>(), dropdownOwners = new WeakMap<HTMLElement, Element>();

function resolveElement(target: Target, label: string, doc?: Document, allowMissing?: false): Element;
function resolveElement(target: Target, label: string, doc: Document, allowMissing: true): Element | null;
function resolveElement(target: Target, label: string, doc = document, allowMissing = false): Element | null {
  if (typeof target === 'string') {
    const matches = doc.querySelectorAll(target);
    if (matches.length > 1) throw new Error(`${label} must match exactly one element. Use a unique selector.`);
    if (!matches.length) {
      if (allowMissing) return null;
      throw new Error(`${label} did not match an element.`);
    }
    return matches[0];
  }
  if (!target || target.nodeType !== 1 || !target.ownerDocument) throw new TypeError(`${label} must be an element or a unique CSS selector.`);
  return target;
}

function validateOptions(options: NepaliPiUpdate) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('NepaliPi options must be an object.');
  for (const key of ['enabled', 'numberShortcuts'] as const) {
    if (key in options && typeof options[key] !== 'boolean') throw new TypeError(`${key} must be a boolean.`);
  }
  if ('onError' in options && options.onError !== null && typeof options.onError !== 'function') throw new TypeError('onError must be a function or null.');
}

function dropdownConfig(value: NepaliPiUpdate['dropdown'], element: Element, previous: DropdownConfig | null = null): DropdownConfig | null {
  if (value === false || value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('dropdown needs a container and render function, or false.');
  const config = { position: 'caret' as Position, ...previous, ...value };
  if (!config.container) throw new TypeError('Dropdown container must be an element or a unique CSS selector.');
  const container = resolveElement(config.container, 'Dropdown container', element.ownerDocument) as HTMLElement;
  if (container.ownerDocument !== element.ownerDocument) throw new Error('Dropdown and field must belong to the same document.');
  if (container.contains(element) || element.contains(container)) throw new Error('Dropdown container must be separate from the target field.');
  if (typeof config.render !== 'function') throw new TypeError('dropdown.render must be a function; Nepalipi creates no suggestion HTML.');
  if (!['caret', 'manual'].includes(config.position)) throw new TypeError('dropdown.position must be caret or manual.');
  const owner = dropdownOwners.get(container);
  if (owner && owner !== element) throw new Error('This dropdown container belongs to another field.');
  return { container, render: config.render, position: config.position };
}

function bindDropdown(config: DropdownConfig, element: InputField, core: Core, controller: NepaliPiController, hooks: Hooks) {
  const container = config.container, initialHidden = container.hidden;
  let cleanup: Cleanup | undefined, positioner: ReturnType<typeof attachCaretPopup> | undefined;
  let unsubscribe: Cleanup = () => {}, disposed = false, mounting = true;
  dropdownOwners.set(container, element);
  const binding = {
    element: container,
    reposition() { positioner?.update(); },
    destroy() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      const previousCleanup = cleanup;
      cleanup = undefined;
      try { if (previousCleanup) hooks.invoke(previousCleanup); }
      finally {
        positioner?.destroy();
        container.hidden = initialHidden;
        dropdownOwners.delete(container);
      }
    },
  };
  try {
    if (config.position === 'caret') positioner = attachCaretPopup(element, container);
    unsubscribe = core.subscribe(state => {
      if (disposed) return;
      try {
        const previousCleanup = cleanup;
        cleanup = undefined;
        if (previousCleanup) hooks.invoke(previousCleanup);
        if (disposed) return;
        container.hidden = !state.open;
        const result = hooks.invoke(() => config.render(state, { container, controller }));
        if (typeof result === 'function') {
          if (disposed) hooks.invoke(result);
          else cleanup = result;
        }
        if (!disposed) positioner?.update();
      } catch (error) {
        if (mounting) throw error;
        try { binding.destroy(); }
        catch { /* Preserve the original failure and keep native edits usable. */ }
        finally {
          container.hidden = true;
          hooks.failed(binding, error);
        }
      }
    });
    mounting = false;
    return binding;
  } catch (error) {
    binding.destroy();
    throw error;
  }
}

export function NepaliPi(target: Target, options: NepaliPiOptions = {}): NepaliPiController {
  if (typeof document === 'undefined') throw new Error('NepaliPi attaches in the browser after the target field exists.');
  validateOptions(options);
  const element = resolveElement(target, 'NepaliPi target') as InputField;
  if (instances.has(element)) throw new Error('NepaliPi is already attached. Use NepaliPi.get(target) to control the existing instance.');
  let config = options.dropdown === undefined ? null : dropdownConfig(options.dropdown, element);
  const core = attachNepalipi(element, options);
  let binding: Binding | null = null, destroyed = false, renderDepth = 0, onError = options.onError;
  const checkAlive = () => { if (destroyed) throw new Error('This NepaliPi instance has been destroyed.'); };
  const checkMutable = () => {
    checkAlive();
    if (renderDepth) throw new Error('NepaliPi mutations are not allowed inside dropdown render/cleanup callbacks. Use an event handler or a later task.');
  };
  const reportError = (error: unknown, code: ErrorCode) => {
    if (onError) {
      try { onError(error, { code, target: element }); return; }
      catch { /* A consumer error handler must not interrupt a completed edit. */ }
    }
    console.error(`NepaliPi: ${code}. Provide onError to inspect the consumer callback failure.`);
  };
  const hooks: Hooks = {
    invoke(callback) {
      renderDepth++;
      try { return callback(); }
      finally { renderDepth--; }
    },
    failed(failedBinding, error) {
      if (binding === failedBinding) binding = null;
      reportError(error, 'DROPDOWN_RENDER_FAILED');
    },
  };
  const mountDropdown = () => {
    if (!config) return;
    const created = bindDropdown(config, element, core, controller, hooks);
    if (destroyed) created.destroy();
    else binding = created;
  };
  const controller: NepaliPiController = {
    target: element,
    subscribe(listener) {
      let initial = true, off = () => {};
      off = core.subscribe(state => {
        try { listener(state); }
        catch (error) {
          if (initial) throw error;
          off();
          reportError(error, 'SUBSCRIBER_FAILED');
        }
      });
      initial = false;
      return off;
    },
    getState: core.getState,
    choose(...args) { checkMutable(); return core.choose(...args); },
    highlight(...args) { checkMutable(); return core.highlight(...args); },
    open() { checkMutable(); return core.open(); },
    dismiss() { checkMutable(); return core.dismiss(); },
    getInputAttributes: core.getInputAttributes,
    getListAttributes: core.getListAttributes,
    getOptionAttributes: core.getOptionAttributes,
    getCaretRect() { checkAlive(); return getCaretRect(element); },
    enable() { return controller.update({ enabled: true }); },
    disable() { return controller.update({ enabled: false }); },
    setHints(hints) { return controller.update({ hints }); },
    update(changes) {
      checkMutable();
      validateOptions(changes);
      const nextConfig = 'dropdown' in changes ? dropdownConfig(changes.dropdown, element, config) : config;
      core.update(changes);
      if ('onError' in changes) onError = changes.onError;
      if ('dropdown' in changes) {
        binding?.destroy();
        binding = null;
        config = nextConfig;
        if (config && !destroyed) mountDropdown();
      }
      return controller;
    },
    dropdown: {
      get element() { return binding?.element ?? null; },
      open() { checkMutable(); return binding ? core.open() : false; },
      close() { checkMutable(); core.dismiss(); },
      update(changes) { return controller.update({ dropdown: changes }); },
      reposition() { checkAlive(); binding?.reposition(); },
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      try { binding?.destroy(); }
      finally { binding = null; core.destroy(); instances.delete(element); }
    },
  };
  instances.set(element, controller);
  try {
    if ('enabled' in options) core.update({ enabled: options.enabled });
    if (config) mountDropdown();
    return controller;
  } catch (error) {
    controller.destroy();
    throw error;
  }
}

NepaliPi.get = (target: Target): NepaliPiController | null => {
  const element = resolveElement(target, 'NepaliPi target', document, true);
  return element ? instances.get(element) ?? null : null;
};

if (typeof window !== 'undefined') {
  if (window.NepaliPi !== undefined && window.NepaliPi !== NepaliPi) throw new Error('window.NepaliPi is already defined; the existing global was preserved.');
  window.NepaliPi = NepaliPi;
}

export default NepaliPi;
