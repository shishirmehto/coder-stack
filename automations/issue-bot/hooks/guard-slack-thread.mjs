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
//   a field it doesn't know, a destination that isn't a Slack ID,
//   missing or placeholder channel IDs, or an unexpected error.

const readTools = /__slack_(read_[a-z_]+|search_[a-z_]+|list_[a-z_]+|get_reactions)$/;
const otherAllowedWrites = /__slack_(add_reaction|get_file_upload_url)$/;
// The fields each posting tool may carry, from the Slack connector's schemas.
// A field outside this list could name a destination the guard never checks, so it is denied.
const postingFields = {
  send_message: ["channel_id", "message", "thread_ts", "reply_broadcast", "unfurl_app_links", "draft_id"],
  schedule_message: ["channel_id", "message", "post_at", "thread_ts", "reply_broadcast"],
  send_message_draft: ["channel_id", "message", "thread_ts"],
  complete_file_upload: ["file_id", "channel_id", "initial_comment", "thread_ts", "title"],
};
// Guarded channels are channel or DM IDs. A post may also name a user ID (U or W) to send a DM.
const channelId = /^[CDG][A-Z0-9]{2,}$/;
const destinationId = /^[CDGUW][A-Z0-9]{2,}$/;

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
  const posting = Object.keys(postingFields).find((name) => toolName.endsWith(`__slack_${name}`));
  if (posting === undefined) {
    deny("The Slack guard in this repository allows only posts, file shares, and reactions. Use one of those, or ask a person to make this change.");
  }

  const unknown = Object.keys(input).find((field) => !postingFields[posting].includes(field));
  if (unknown !== undefined) {
    deny(`Slack guard doesn't know the "${unknown}" field of slack_${posting}, so it blocks the call.`);
  }
  if (input.channel_id === undefined) {
    // A file upload without a channel is uploaded but not shared anywhere,
    // and the field list above leaves it no other way to name a destination.
    if (posting === "complete_file_upload") process.exit(0);
    deny("Slack guard got a post without channel_id, so it blocks it.");
  }
  if (typeof input.channel_id !== "string") {
    deny("Slack guard got a channel_id that isn't a string, so it blocks the call.");
  }
  const channel = input.channel_id.trim().toUpperCase();
  if (!destinationId.test(channel)) {
    deny(`Slack guard got channel_id "${input.channel_id}", which isn't a Slack channel or user ID, so it blocks the call.`);
  }
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
