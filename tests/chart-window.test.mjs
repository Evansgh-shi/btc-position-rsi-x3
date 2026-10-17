import test from 'node:test';
import assert from 'node:assert/strict';
import { chartWindow, zoomWindow, moveWindow } from '../lib/chart-window.mjs';

test('presets and latest-anchored windows include the requested observations', () => {
  assert.deepEqual(chartWindow(3000, {count:90,end:null}), {start:2910,end:2999});
  assert.deepEqual(chartWindow(3001, {count:90,end:null}), {start:2911,end:3000});
  assert.deepEqual(chartWindow(3000, {count:Infinity,end:null}), {start:0,end:2999});
});

test('zoom keeps a bounded centered window and supports the full history', () => {
  const view = {count:90,end:1500};
  const zoomed = zoomWindow(3000,view,.5);
  const a=chartWindow(3000,view),b=chartWindow(3000,zoomed);
  assert.equal(b.end-b.start+1,45);
  assert.ok(Math.abs((a.start+a.end)-(b.start+b.end)) <= 1);
  assert.equal(zoomWindow(3000,{count:14,end:null},.5).count,14);
  assert.deepEqual(chartWindow(3000,zoomWindow(3000,view,100)),{start:0,end:2999});
});

test('timeline movement clamps at both edges without changing its span', () => {
  assert.deepEqual(moveWindow(3000,{count:90,end:null},0),{count:90,end:89});
  assert.deepEqual(moveWindow(3000,{count:90,end:89},9999),{count:90,end:null});
});
