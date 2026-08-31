# Replay Vault full-catalog completeness audit (read-only evidence)

Scope: `access_scope = 'replay_vault'` only. No code, deploy, migration, row mutation, publication, or control change was made. No titles, IDs, locators, paths, URLs, transcript text, emails, or user IDs are included below.

## 1. Catalog completeness (1,292 resources in scope)

| Check | Exceptions | Result |
|---|---|---|
| Total resources in scope | 1,292 | — |
| Missing active transcript version | 0 | PASS |
| Missing at least one transcript segment | 0 | PASS |
| Missing at least one nonempty search-vector cue | 0 | PASS |
| Missing active playback attempt | 0 | PASS |
| Active attempt not `verified` | 0 | PASS |
| Empty Dropbox file identity | 0 | PASS |
| Non-positive resource (source) duration | 0 | PASS |
| Non-positive media-attempt duration | 0 | PASS |
| Resource vs attempt duration mismatch > 2,000 ms | 0 | PASS |
| Duplicate active media-attempt bindings | 0 | PASS |
| Duplicate Dropbox file identities (groups / resources involved) | 0 / 0 | PASS |
| Missing any required search or playback component | 0 | PASS |

## 2. Title self-searchability

| Check | Count | Result |
|---|---|---|
| Titles under 2 normalized characters | 0 | PASS |
| Titles that cannot form a query (`numnode(...) = 0`) | 0 | PASS |
| Title metadata vector matches its own websearch query | 1,224 | PASS |
| Self-match failures | 68 | FAIL (exception set) |

Aggregate shape of the 68 failures (no titles returned): 9 contain underscores, 23 contain digits, 10 exceed 80 characters, average query node count 13.56 — i.e. long, token-dense titles. Root cause not diagnosed; evidence only.

## 3. Media attempt status and verification age

| Field | Value |
|---|---|
| Active attempts by status | `verified`: 1,292 (no other status present) |
| Full decode + range + sample-seek evidence all true | 1,292 |
| Verification evidence hash present | 1,292 |
| Age of oldest verification | 2 days 02:20:19 |
| Age of newest verification | 03:48:51 |

## 4. Launch, publication, and visibility controls

| Control | Value | Result |
|---|---|---|
| `replay_vault_launch_config.launch_state` | `disabled` | PASS |
| `replay_publication_controls.publication_enabled` | false | PASS |
| Published resource projection rows | 0 | PASS |
| Member-visible-by-default resources in scope | 0 | PASS |
| Publication authority states | DRAFT 1,289 / APPROVED 4 / PUBLISHED 0 | PASS |

## Exact definitions used

**Verified media** — a resource's active attempt joined as `mastermind_portal_resources.active_playback_attempt_id = replay_media_migration_attempts.id`, counted as verified when:

```sql
a.status = 'verified'
AND coalesce(nullif(trim(a.dropbox_file_id), ''), '') <> ''
AND coalesce(a.duration_ms, 0) > 0
AND a.full_decode_ok AND a.range_request_ok AND a.sample_seek_ok
```

Duration comparison used the media attempt's `duration_ms` against the linked `replay_source_assets.duration_ms`, flagged when `abs(src_ms - att_ms) > 2000`.

**Searchable** — a resource is searchable when it has transcript cues and a self-matching title vector:

```sql
r.active_transcript_version_id IS NOT NULL
AND (SELECT count(*) FROM replay_transcript_segments g
      WHERE g.transcript_version_id = r.active_transcript_version_id) > 0
AND (SELECT count(*) FROM replay_transcript_segments g
      WHERE g.transcript_version_id = r.active_transcript_version_id
        AND g.search_vector IS NOT NULL
        AND length(g.search_vector::text) > 2) > 0
-- title self-match, over normalized title t = btrim(regexp_replace(title, '\s+', ' ', 'g'))
AND numnode(websearch_to_tsquery('english', t)) > 0
AND r.metadata_search_vector @@ websearch_to_tsquery('english', t)
```

## Overall

PASS on every playback/transcript completeness, duplication, duration, and control check. One FAIL bucket: 68 of 1,292 titles do not match a websearch query built from their own title. Transcript cue coverage for those resources is intact, so they remain findable by transcript search; only exact full-title metadata matching is affected. No fixes proposed or applied in this pass.
