import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FilterDropdown from './FilterDropdown';

describe('FilterDropdown', () => {
  it('renders a design-system trigger and accessible listbox instead of a native select', () => {
    const markup = renderToStaticMarkup(createElement(FilterDropdown, {
      id: 'risk-filter',
      label: 'Risk',
      ariaLabel: 'Filter approvals by risk',
      value: 'all',
      options: [
        { value: 'all', label: 'All risk levels' },
        { value: 'high', label: 'High risk' },
      ],
      isOpen: true,
      onChange: () => undefined,
      onOpenChange: () => undefined,
    }));

    assert.doesNotMatch(markup, /<select/);
    assert.match(markup, /role="combobox"/);
    assert.match(markup, /role="listbox"/);
    assert.match(markup, /role="option"/);
    assert.match(markup, /aria-selected="true"/);
    assert.match(markup, /All risk levels/);
  });
});
