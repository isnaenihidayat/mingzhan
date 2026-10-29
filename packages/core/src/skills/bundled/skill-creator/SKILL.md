---
name: skill-creator
description: Skill evaluation, skill trigger accuracy, reusable skill benchmarks and improving existing skill behavior. Evaluasi skill, pengujian skill, optimasi skill.
include-body-on-match: false
---

Improve MíngZhàn skills through observable behavior rather than adding more instructions by default.

1. Read the assigned skills catalog and the target skill. Use create-skill/manage-skills and skill_manage for actual changes; do not write bundled/global skill files from a chat agent.
2. Identify realistic requests that should trigger the skill and near misses that should not. Define success in terms of usable output, preserved data, correct tools and task boundaries, not exact wording.
3. Keep descriptions focused. MíngZhàn matches names and description keywords; broad words can overmatch. Use supporting references for conditional detail and set include-body-on-match only when eager body loading is justified.
4. Run permitted trials in an isolated profile workspace when the required tools are available. Compare the same cases before/after, separate model variance from reproducible failures, and record which trials actually ran. Do not claim statistical significance from a single run.
5. Patch only demonstrated weaknesses. Preserve user choices and existing permissions. Skill creation/changes follow the existing skill_manage approval and organization review flow; this skill grants no new permissions.
