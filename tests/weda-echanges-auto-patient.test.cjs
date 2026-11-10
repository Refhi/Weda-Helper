const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { setImmediate: flushPromises } = require('node:timers/promises');
const vm = require('node:vm');

const source = fs.readFileSync(process.env.WEDA_ECHANGES_SOURCE ||
    path.join(__dirname, '../src/features/wedaEchanges.js'), 'utf8');

function setup() {
    const timers = new Map();
    let nextTimer = 0;
    let selected;
    let onClick;
    let onMutation;
    const searches = [];
    const button = { click: () => searches.push(selected.name) };
    const document = {
        addEventListener(type, listener) {
            assert.equal(type, 'click');
            onClick = listener;
        },
        querySelector(selector) {
            return selector === '.messageListItem.selected' ? selected : button;
        }
    };
    const setTimeout = callback => {
        timers.set(++nextTimer, callback);
        return nextTimer;
    };
    vm.runInNewContext(source, {
        addTweak(_url, name, init) {
            if (name === 'autoClickUnPatient') init();
        },
        document,
        MutationObserver: class {
            constructor(callback) { onMutation = callback; }
            observe() {}
        },
        setTimeout,
        clearTimeout: id => timers.delete(id),
        sleep: () => new Promise(resolve => setTimeout(resolve)),
        recordMetrics() {},
        console: { log() {} }
    });

    function makeLine(name) {
        return {
            name,
            isConnected: true,
            closest(selector) {
                if (selector === '#messageList .messageLineItem') return this;
                if (selector === '.messageListItem.selected' && selected === this) return this;
                return null;
            }
        };
    }

    function open(line, isTrusted = true) {
        onClick?.({ target: line, isTrusted });
        selected = line;
        onMutation?.();
    }

    function replaceSelectedLine() {
        const { name } = selected;
        selected.isConnected = false;
        selected = null;
        onMutation?.();
        selected = makeLine(name);
        onMutation?.();
    }

    async function runTimers() {
        for (const [id, callback] of timers) {
            timers.delete(id);
            callback();
            await flushPromises();
        }
    }

    return { makeLine, open, replaceSelectedLine, runTimers, searches };
}

test('rebuilding the selected message during patient lookup does not start another lookup', async () => {
    const page = setup();
    page.open(page.makeLine('message A'));
    await page.runTimers();
    assert.deepEqual(page.searches, ['message A']);

    page.replaceSelectedLine();
    await page.runTimers();
    assert.deepEqual(page.searches, ['message A']);
});

test('a click from the message queue and an explicit return both trigger the lookup', async () => {
    const page = setup();
    const first = page.makeLine('message A');
    const second = page.makeLine('message B');
    page.open(first, false);
    await page.runTimers();
    page.open(second, false);
    await page.runTimers();
    page.open(first);
    await page.runTimers();
    assert.deepEqual(page.searches, ['message A', 'message B', 'message A']);
});

test('rapid openings only search for the last selected message', async () => {
    const page = setup();
    page.open(page.makeLine('message A'));
    page.open(page.makeLine('message B'));
    await page.runTimers();
    assert.deepEqual(page.searches, ['message B']);
});
