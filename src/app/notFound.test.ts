import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import NotFound from './not-found';

test('branded not-found recovery exposes scanner and methodology actions', () => {
  const markup = renderToStaticMarkup(createElement(NotFound));

  assert.match(markup, /WALLET<span class="text-\[#ff5500\]">\.<\/span>GENOME/);
  assert.match(markup, /<h1[^>]*>This page could not be found\.<\/h1>/);
  assert.match(markup, /href="\/"[^>]*>[\s\S]*Return to scanner/);
  assert.match(markup, /href="\/docs"[^>]*>[\s\S]*Read methodology/);
});
