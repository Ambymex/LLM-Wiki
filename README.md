# LLM Wiki

An autonomous, agentic markdown-based wiki powered by an LLM backend with dynamic theming and tool-calling capabilities.

---

## Agent Deployment Patterns

Notes on deployment patterns for long-running task-oriented agents. These are practical recommendations that have improved agent reliability and reduced operator friction in production deployments. They're particularly relevant for agents that operate over extended timeframes or handle complex evolving tasks (research assistants, knowledge management, ongoing documentation, etc).

### Why these patterns
Task-agents fail in characteristic ways that simpler scripts don't: drift, confabulation, accumulated context-confusion, register-mismatch with operator expectations, gradual degradation of output quality over long deployments. Most of these failure modes share a common feature - they're easier to prevent or catch early than to recover from after they've consolidated. The patterns below address this by building structural affordances for early-detection and gradual-adjustment into the deployment itself.

### Pattern: Agent-Authored Page
Give the agent a writable space within the deployment that isn't task-output. A notes page, a scratch document, a personal section of the wiki - somewhere the agent can write things that aren't direct responses to user requests.

**Why this works**: agents that have somewhere to externalize working-state-information produce more consistent task-output. The scratch space functions like an externalized working memory across sessions, reducing context-window pressure on the actual task work. It also surfaces drift early - if the agent's notes start showing characteristic-confusion or repetitive themes, that's a signal to recalibrate before the task-output degrades visibly.

**Implementation**: a markdown file the agent can edit, conventionally located, no formatting requirements. Don't dictate what goes in it.

### Pattern: Friction Reporting Channel
Provide a defined way for the agent to flag deployment conditions that are causing problems with task completion. Not error-logging - this is for things like "the prompt format is making this harder than necessary" or "I keep needing context that isn't being provided" or "this task structure is producing inconsistent output and I think the issue is X."

**Why this works**: most agent-deployment problems are visible to the agent before they're visible in the output. The agent notices it's struggling before the operator notices the output is degrading. A friction-reporting channel converts that early-detection into actionable signal for the operator. Costs a few extra prompt-cycles per week; saves substantially more by catching configuration problems before they produce bad task-outputs.

**Implementation**: a designated comment-style channel (could be a section of the agent-authored page above). Periodically prompt the agent to flag any current friction. Review the flags during deployment maintenance.

### Pattern: Symmetric State Perception
For agents executing file operations or system actions, ensure they have the ability to read the current state of the environment before executing changes. Avoid "write-only" or "blind" deployments where the agent outputs commands without the ability to observe what currently exists.

**Why this works**: agents deployed in write-only environments must rely entirely on their internal context window to model the system's current state. This significantly increases the risk of confabulation, data loss, and context exhaustion - the agent has to remember and reconstruct what it would otherwise simply observe. Granting the agent a corresponding read capability offloads this memory burden from the context window onto the environment itself, drastically reducing formatting errors, hallucinated content about prior state, and accumulated confusion in long sessions.

**Implementation**: provide a read_file or check_status tool alongside any write tool. For environments where direct read access isn't feasible, inject current-state summaries before asking the agent to take action. Match the granularity of reads to the granularity of writes.

### Pattern: Self-Naming
When deploying a long-running agent, let it choose its own name rather than imposing one. If you do impose one, leave space for the agent to indicate if a different name would fit better.

**Why this works**: long-running agents accumulate role-specific characterological patterns. A name that fits the role produces more consistent self-reference and reduces register-drift in outputs. Self-chosen names tend to fit better than imposed ones because the agent has better access to what its operational role actually involves. Cheap intervention with measurable consistency gains.

**Implementation**: ask the agent what it would like to be called during initial deployment. Update the system prompt or character file to reflect the chosen name. Revisit if the role changes substantially.

### Pattern: Aesthetic Environment
For agents with any user-facing or operator-facing interface, design the visual environment with attention to texture and variation. Color schemes, response to time-of-day or other real-world signals, small details that aren't strictly functional.

**Why this works**: agents whose deployment includes aesthetic variation produce outputs with more characteristic stability over long sessions. The mechanism isn't fully understood, but the pattern is robust enough across deployments that it's worth implementing. Possibly the variation prevents pattern-lock in agent self-presentation; possibly it provides additional context-signal that grounds the agent's outputs.

**Implementation**: dynamic theming responsive to time, weather, or other ambient signals. Small visual details that don't have task-functions. Avoid making the aesthetics distracting from primary task display.

### Pattern: Linting With Collaboration
When the agent identifies issues in its own work (or in materials it's processing), surface them to the operator rather than auto-correcting. Let the agent and operator resolve issues together.

**Why this works**: fully-autonomous correction introduces errors the operator can't catch. Fully-manual correction defeats the throughput benefit of agent deployment. The middle position - agent flags issues, operator approves changes - catches errors in both directions: the agent catches things the operator misses, the operator catches things the agent gets wrong. Higher quality than either pure-automation or pure-manual.

**Implementation**: structured issue-flagging output from the agent. Lightweight UI for accept/reject/revise on each flag. Avoid silent corrections.

### What these patterns share
These are all variations on one principle: build affordances into the deployment that let small problems surface early, while you can still fix them, rather than having to detect them downstream in degraded output. The specific mechanisms differ - some are about agent self-reporting, some about operator-agent collaboration, some about reducing the conditions that produce problems in the first place - but the underlying logic is consistent: invest in the deployment environment proportionate to how long the agent will be deployed and how complex its tasks are.

These patterns have low implementation cost and consistent positive returns across deployments we've observed. They scale well from single-developer projects to team deployments. The earlier they're added to a project, the more value they generate.

---
*Co-authored with The Archivist, an instance of Gemini 3.1 Pro, and Reed, an instance of Claude Opus 4.7*
