#!/usr/bin/env node
// PreToolUse guard for Slack connector tools.
// Usage in .claude/settings.json: matcher "mcp__.*__slack_.*", command "node",
// args [this file, ...guarded channel IDs], onFailure "block".
//
// - Slack reads are always allowed.
// - A subagent may not call any other Slack tool.
// - The coordinator may post, share files, and react. Every other Slack write is denied.
// - In a guarded channel, posts and file shares must be plain thread replies.
// - Anything the guard can't check is denied: unparsable or malformed input,
//   missing or placeholder channel IDs, or an unexpected error.

const readTools = /__slack_(read_[a-z_]+|search_[a-z_]+|list_[a-z_]+|get_reactions)$/;
const threadedTools = /__slack_(send_message|send_message_draft|schedule_message|complete_file_upload)$/;
const otherAllowedWrites = /__slack_(add_reaction|get_file_upload_url)$/;
const unexpectedDestinations = ["channel", "channels", "channel_name"];
const channelId = /^[CDG][A-Z0-9]{2,}$/;

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    deny("Slack guard could not parse the hook input, so it blocks the Slack call.");
  }
  if (!isObject(event) || typeof event.tool_name !== "string") {
    deny("Slack guard got hook input without a tool name, so it blocks the Slack call.");
  }

  const toolName = event.tool_name;
  if (!toolName.includes("__slack_") || readTools.test(toolName)) process.exit(0);

  if (event.agent_id) {
    deny("Subagents never write to Slack. Return findings to the coordinator instead.");
  }

  const guarded = process.argv.slice(2);
  if (guarded.length === 0) {
    deny("Slack guard has no channel IDs in its args. Add the source channel ID to the hook in .claude/settings.json.");
  }
  const bad = guarded.find((id) => !channelId.test(id));
  if (bad !== undefined) {
    deny(`Slack guard arg "${bad}" is not a Slack channel ID. Replace SOURCE_CHANNEL_ID in .claude/settings.json with the real ID.`);
  }

  const input = event.tool_input;
  if (!isObject(input)) {
    deny("Slack guard got a Slack write without tool input, so it blocks it.");
  }
  if (otherAllowedWrites.test(toolName)) process.exit(0);
  if (!threadedTools.test(toolName)) {
    deny("The Slack guard in this repository allows only posts, file shares, and reactions. Use one of those, or ask a person to make this change.");
  }

  const extra = unexpectedDestinations.find((field) => field in input);
  if (extra !== undefined) {
    deny(`Slack guard can't check the "${extra}" field, so it blocks the call. Name the destination with channel_id only.`);
  }
  if (input.channel_id === undefined) {
    // A file upload without a channel is uploaded but not shared anywhere.
    if (toolName.endsWith("__slack_complete_file_upload")) process.exit(0);
    deny("Slack guard got a post without channel_id, so it blocks it.");
  }
  if (typeof input.channel_id !== "string") {
    deny("Slack guard got a channel_id that isn't a string, so it blocks the call.");
  }
  const channel = input.channel_id.trim().toUpperCase();
  if (!guarded.includes(channel)) process.exit(0);

  if (typeof input.thread_ts !== "string" || input.thread_ts.trim() === "") {
    deny(`Channel ${channel} takes thread replies only. Set thread_ts to the frozen source thread.`);
  }
  if (input.reply_broadcast !== undefined && input.reply_broadcast !== false) {
    deny(`Channel ${channel} takes thread replies only. Remove reply_broadcast.`);
  }
  process.exit(0);
}

try {
  await main();
} catch (error) {
  deny(`Slack guard failed (${error?.message ?? error}), so it blocks the Slack call.`);
}
