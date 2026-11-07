import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const hook = fileURLToPath(new URL("./guard-slack-thread.mjs", import.meta.url));
const settingsTemplate = fileURLToPath(new URL("../templates/settings.example.json", import.meta.url));

function run(input, channels = ["C111", "C222"]) {
  const result = spawnSync("node", [hook, ...channels], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout === "" ? "allow" : JSON.parse(result.stdout).hookSpecificOutput.permissionDecision;
}

const send = (toolInput, extra = {}) => ({
  tool_name: "mcp__slack__slack_send_message",
  tool_input: { message: "hi", ...toolInput },
  ...extra,
});

const upload = (toolInput, extra = {}) => ({
  tool_name: "mcp__slack__slack_complete_file_upload",
  tool_input: { file_id: "F123", ...toolInput },
  ...extra,
});

test("denies a root post in a guarded channel", () => {
  assert.equal(run(send({ channel_id: "C111" })), "deny");
});

test("denies a blank thread_ts in a guarded channel", () => {
  assert.equal(run(send({ channel_id: "C111", thread_ts: " " })), "deny");
});

test("allows a thread reply in a guarded channel", () => {
  assert.equal(run(send({ channel_id: "C111", thread_ts: "1700000000.000100" })), "allow");
});

test("denies a broadcast reply in a guarded channel", () => {
  assert.equal(run(send({ channel_id: "C222", thread_ts: "1700000000.000100", reply_broadcast: true })), "deny");
});

test("allows a root post in a channel it does not guard", () => {
  assert.equal(run(send({ channel_id: "C999" })), "allow");
});

test("guards drafts and scheduled messages like posts", () => {
  assert.equal(run({ tool_name: "mcp__x__slack_send_message_draft", tool_input: { channel_id: "C222", message: "hi" } }), "deny");
  assert.equal(run({ tool_name: "mcp__x__slack_schedule_message", tool_input: { channel_id: "C222", message: "hi" } }), "deny");
});

test("guards file shares like posts", () => {
  assert.equal(run(upload({ channel_id: "C111", initial_comment: "evidence" })), "deny");
  assert.equal(run(upload({ channel_id: "C111", thread_ts: "1700000000.000100" })), "allow");
  assert.equal(run(upload({})), "allow", "an upload with no channel is not shared anywhere");
});

test("denies every Slack write from a subagent", () => {
  const subagent = { agent_id: "agent-1" };
  assert.equal(run(send({ channel_id: "C999", thread_ts: "1" }, subagent)), "deny");
  assert.equal(run(upload({ channel_id: "C999", thread_ts: "1" }, subagent)), "deny");
  for (const tool of ["add_reaction", "create_canvas", "update_canvas", "create_conversation", "get_file_upload_url", "add_list_record"]) {
    assert.equal(run({ tool_name: `mcp__slack__slack_${tool}`, tool_input: {}, ...subagent }), "deny", tool);
  }
});

test("lets a subagent read Slack", () => {
  const subagent = { agent_id: "agent-1" };
  for (const tool of ["read_thread", "read_channel", "search_public", "list_user_channels", "get_reactions"]) {
    assert.equal(run({ tool_name: `mcp__slack__slack_${tool}`, tool_input: { channel_id: "C111" }, ...subagent }), "allow", tool);
  }
});

test("allows the coordinator's status reaction on a guarded root", () => {
  assert.equal(
    run({ tool_name: "mcp__slack__slack_add_reaction", tool_input: { channel_id: "C111", message_ts: "1", emoji: "eyes" } }),
    "allow",
  );
});

test("lets the coordinator start a file upload but no other non-posting write", () => {
  assert.equal(run({ tool_name: "mcp__slack__slack_get_file_upload_url", tool_input: { filename: "a.png", content_length: 1 } }), "allow");
  for (const tool of ["create_canvas", "update_canvas", "create_conversation", "add_list_record", "some_future_write"]) {
    assert.equal(run({ tool_name: `mcp__slack__slack_${tool}`, tool_input: { title: "x" } }), "deny", tool);
  }
});

test("normalizes channel_id before comparing it", () => {
  assert.equal(run(send({ channel_id: " c111 " })), "deny");
  assert.equal(run(send({ channel_id: 111 })), "deny", "a non-string channel_id");
  assert.equal(run(send({ channel_id: ["C111"] })), "deny", "an array channel_id");
  assert.equal(run(send({})), "deny", "a post with no channel_id");
});

test("denies destination fields it does not check", () => {
  assert.equal(run(send({ channel_id: "C999", channel: "C111" })), "deny");
  assert.equal(run(upload({ channels: "C111" })), "deny", "an upload shared through channels");
  assert.equal(run(send({ channel_id: "C999", channel_name: "bugs" })), "deny");
});

test("denies any reply_broadcast value other than false in a guarded channel", () => {
  const reply = { channel_id: "C111", thread_ts: "1700000000.000100" };
  assert.equal(run(send({ ...reply, reply_broadcast: "true" })), "deny");
  assert.equal(run(send({ ...reply, reply_broadcast: 1 })), "deny");
  assert.equal(run(send({ ...reply, reply_broadcast: false })), "allow");
});

test("ignores tools that are not Slack tools", () => {
  assert.equal(run({ tool_name: "Bash", tool_input: { command: "ls" } }), "allow");
});

test("fails closed on input it cannot parse or that is not an event", () => {
  assert.equal(run("not json"), "deny");
  assert.equal(run("null"), "deny");
  assert.equal(run("[]"), "deny");
  assert.equal(run("42"), "deny");
  assert.equal(run({ tool_input: { channel_id: "C111" } }), "deny", "no tool_name");
  assert.equal(run({ tool_name: "mcp__slack__slack_send_message", tool_input: null }), "deny", "no tool_input");
});

test("fails closed when the channel args are missing or still the placeholder", () => {
  assert.equal(run(send({ channel_id: "C111", thread_ts: "1" }), []), "deny");
  assert.equal(run(send({ channel_id: "C111", thread_ts: "1" }), ["SOURCE_CHANNEL_ID"]), "deny");
  assert.equal(run(send({ channel_id: "C111", thread_ts: "1" }), ["C111", "SOURCE_CHANNEL_ID"]), "deny");
});

test("the settings template routes every Slack tool through the guard and blocks on hook failure", () => {
  const settings = JSON.parse(readFileSync(settingsTemplate, "utf8"));
  const [entry] = settings.hooks.PreToolUse;
  const [handler] = entry.hooks;
  assert.equal(handler.onFailure, "block");
  assert.ok(handler.args[0].endsWith("/hooks/guard-slack-thread.mjs"));
  const matcher = new RegExp(`^(?:${entry.matcher})$`);
  for (const tool of ["send_message", "complete_file_upload", "create_canvas", "create_conversation", "add_reaction"]) {
    assert.ok(matcher.test(`mcp__claude_ai_Slack__slack_${tool}`), tool);
  }
});
