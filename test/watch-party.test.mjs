import test from "node:test";
import assert from "node:assert/strict";
import { cleanMessage, cleanRoomName, validateRoomId } from "../src/lib/watch-party.js";

test("watch party room IDs are normalized and validated", () => {
  assert.equal(validateRoomId("8xk92m"), "8XK92M");
  assert.throws(() => validateRoomId("bad room"), /Invalid watch party room/);
});

test("chat messages are sanitized and bounded", () => {
  assert.equal(cleanMessage("<b>Hello</b> world"), "Hello world");
  assert.throws(() => cleanMessage(" "), /between 1 and 500/);
});

test("room names reject markup and empty values", () => {
  assert.equal(cleanRoomName("<Night>"), "Night");
  assert.throws(() => cleanRoomName(""), /between 1 and 100/);
});
