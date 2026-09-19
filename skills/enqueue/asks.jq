# Print one line per human ask in a Claude Code session transcript, in order, deduped.
# Usage: jq -rn -f asks.jq ~/.claude/projects/*/<session-id>.jsonl
# The -n is required and this errors without it, rather than printing a partial inventory that reads like a complete one.
if . != null then error("asks.jq needs -n: jq -rn -f asks.jq <session-id>.jsonl") else . end
| [ inputs
    | if .type == "user" and (.isMeta | not) and (.isSidechain | not) and (.toolUseResult | not)
      then (.message.content | if type == "string" then . else ([.[] | select(.type == "text") | .text] | join(" ")) end)
      elif .type == "queue-operation" and .operation == "enqueue" and (.content | type) == "string"
      then .content
      else empty
      end
  ]
| map(
    gsub("(?s)<system-reminder>.*?</system-reminder>"; "")
    | gsub("(?s)<local-command-caveat>.*?</local-command-caveat>"; "")
    | gsub("(?s)<local-command-stdout>.*?</local-command-stdout>"; "")
    | gsub("(?s)<command-message>.*?</command-message>"; "")
    | gsub("(?s)<command-args>.*?</command-args>"; "")
    | gsub("(?s)<task-notification>.*?</task-notification>"; "")
    | gsub("<command-name>|</command-name>"; "")
    | gsub("\n"; " ⏎ ")
    | gsub("^(⏎|\\s)+|(⏎|\\s)+$"; "")
  )
| map(select(length > 0))
| map(select(test("<teammate-message") | not))
| map(select(test("^\\[Request interrupted by user") | not))
| map(select(startswith("This session is being continued from a previous conversation") | not))
| map(if length > 4000 then .[0:4000] + " …[+\(length - 4000) chars]" else . end)
| reduce .[] as $x ([]; if any(.[]; . == $x) then . else . + [$x] end)
| .[]
