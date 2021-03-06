/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @emails oncall+relay
 * @format
 */

'use strict';

const dedupeJSONStringify = require('../dedupeJSONStringify');

function trimIndentation(str) {
  const match = str.match(/( +)[^\n]*$/);
  return !match
    ? str
    : str
        .split('\n')
        .map(line => (line[0] !== ' ' ? line : line.slice(match[1].length)))
        .join('\n');
}

function runTest(data, expected) {
  const encoded = dedupeJSONStringify(data);
  expect(encoded).toBe(trimIndentation(expected));
  // eslint-disable-next-line no-eval
  expect(eval('(' + encoded + ')')).toEqual(data);
}

test('scalars', () => {
  runTest(false, 'false');
  runTest(null, 'null');
  runTest(1, '1');
  runTest('string', '"string"');
});

test('strip undefined values from objects', () => {
  expect(dedupeJSONStringify({a: 1, b: undefined})).toBe('{\n  "a": 1\n}');
});

test('object without duplicates', () => {
  runTest(
    {
      key1: 'val2',
      key2: 'val2',
    },
    `{
      "key1": "val2",
      "key2": "val2"
    }`,
  );
});

test('arrays without duplicates', () => {
  runTest(
    [1, 2, 'x'],
    `[
      1,
      2,
      "x"
    ]`,
  );
});

test('empty arrays', () => {
  runTest(
    {args: [], values: [], dupe1: {key: []}, dupe2: {key: []}},
    `(function(){
    var v0 = {
      "key": ([]/*: any*/)
    };
    return {
      "args": [],
      "values": [],
      "dupe1": (v0/*: any*/),
      "dupe2": (v0/*: any*/)
    };
    })()`,
  );
});

test('extract duplicates', () => {
  runTest(
    [1, {name: 'id'}, {friend: [{name: 'id'}]}],
    `(function(){
    var v0 = {
      "name": "id"
    };
    return [
      1,
      (v0/*: any*/),
      {
        "friend": [
          (v0/*: any*/)
        ]
      }
    ];
    })()`,
  );
});

test('extract identical references', () => {
  const obj = {name: 'id'};
  runTest(
    [obj, obj],
    `(function(){
    var v0 = {
      "name": "id"
    };
    return [
      (v0/*: any*/),
      (v0/*: any*/)
    ];
    })()`,
  );
});

test('extract recursive duplicates', () => {
  runTest(
    [
      {name: 'id', alias: null},
      {name: 'id', alias: null},
      [{name: 'id'}, {name: 'id', alias: 'other'}],
      [{name: 'id'}, {name: 'id', alias: 'other'}],
      [{name: 'id', alias: 'other'}],
    ],
    `(function(){
    var v0 = {
      "name": "id",
      "alias": null
    },
    v1 = {
      "name": "id",
      "alias": "other"
    },
    v2 = [
      {
        "name": "id"
      },
      (v1/*: any*/)
    ];
    return [
      (v0/*: any*/),
      (v0/*: any*/),
      (v2/*: any*/),
      (v2/*: any*/),
      [
        (v1/*: any*/)
      ]
    ];
    })()`,
  );
});
