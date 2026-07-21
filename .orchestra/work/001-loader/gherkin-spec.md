---
ticket: 001-loader
artifact: gherkin
status: approved
created_on: 2026-07-20
approved_on: 2026-07-21
---

# Gherkin Scenarios: Loader — Compass Owns the Bearing Schema

> Source: .orchestra/work/001-loader/spec.md
> Generated: 2026-07-20
> Revised: 2026-07-21

The spec's eight steps split into five features. Step 1 (workspace skeleton) has
no behaviour to assert and appears only as a Background. Step 8's schema spec is
a document deliverable with no runtime behaviour. The scenarios are ordered to
match the spec's TDD sequence: the port lands green against savvy's existing
119-line test file before any v2 scenario below is allowed to go red.

Two scenarios are tagged `@wip`. Both assert a permissive behaviour that M2 is
expected to tighten, so the gap is written down rather than assumed.

```gherkin
Feature: Module boundary — fs is structurally unreachable
  The parser is importable in a Worker; only the loader touches the filesystem

  Background:
    Given the @compass/core package with src/types.ts, src/parse.ts, src/load.ts and src/index.ts

  Scenario: The parser carries no filesystem dependency
    Given the source of src/parse.ts
    When the module boundary test reads it
    Then it contains no node: import specifier
    And it transitively imports nothing that does

  Scenario: No validator escapes into a cast
    Given the source of src/parse.ts
    When the same test scans it
    Then no as-unknown-as cast appears anywhere in the file

  Scenario: The parser runs without Node globals
    Given a context with no filesystem and no bundler
    When parseBearing is imported from parse.js and called with valid bearing text
    Then it returns a parsed bearing without touching a Node global

  Scenario: Both entry points agree
    Given each of the two fixtures on disk and the same fixture read as a string
    When loadBearing is called with the path and parseBearing with the string
    Then the two results are deep-equal for both fixtures
```

```gherkin
Feature: Envelope — schema v2
  Every bearing carries the same envelope, and v2 changes three of its keys

  Background:
    Given a bearing whose envelope is otherwise valid

  Scenario: A minimal bearing of each profile parses
    Given a journey bearing and a standing bearing carrying only required envelope keys
    When each is parsed
    Then both return a bearing whose profile matches its declaration

  Scenario Outline: A missing required envelope key names itself
    Given a bearing with <key> removed
    When it is parsed
    Then it throws a BearingValidationError
    And the message names <key>

    Examples:
      | key     |
      | bearing |
      | name    |
      | version |
      | profile |

  Scenario: An unknown profile value is rejected
    Given a bearing whose profile is neither journey nor standing
    When it is parsed
    Then it throws a BearingValidationError
    And the message names profile and the offending value

  Scenario Outline: A non-integer version is rejected
    Given a bearing whose version is <bad>
    When it is parsed
    Then it throws
    And the message names version

    Examples:
      | bad      |
      | a string |
      | a float  |

  Scenario: An unknown top-level key is rejected
    Given a bearing carrying a key the envelope allow-list does not name
    When it is parsed
    Then it throws
    And the message names the offending key

  Scenario: A v1 bearing carrying audience is rejected
    Given a bearing carrying the v1 audience key
    When it is parsed
    Then it throws through the same allow-list path with no code specific to audience
    And the message names audience

  Scenario: source is optional in v2
    Given a bearing omitting source
    When it is parsed
    Then it parses
    And the result has no source key at all
    And a source present but not an array of non-empty strings is rejected naming source

  Scenario: client round-trips when present
    Given a bearing declaring client as a non-empty string
    When it is parsed
    Then client survives unchanged in the output
    And a bearing omitting client parses with no client key
    And a client set to an empty string is rejected with a message naming it
```

```gherkin
Feature: Journey profile — construct, don't cast
  Stages are built from validated values, so optional fields can no longer slip through

  Background:
    Given a journey bearing with a valid envelope

  Scenario: The Brand Builder fixture parses end to end
    Given fixtures/journey-example.yaml at schema v2
    When it is parsed
    Then every stage carries its validated id, title, prompt and gate

  Scenario: Every optional field is accepted when well formed
    Given a journey declaring mode, and a stage declaring artifact, unlocks, scoring and gate.requires_signoff
    When it is parsed
    Then each optional value survives unchanged in the output

  Scenario: Every optional field is omitted when absent
    Given a journey declaring no mode, and a stage declaring only id, title, prompt and gate.rule
    When it is parsed
    Then it parses
    And the result carries no key for any absent optional field

  Scenario Outline: A malformed optional field is rejected by path
    Given a journey where <field> is <malformed>
    When it is parsed
    Then it throws a BearingValidationError
    And the message carries the positional path <field>

    Examples:
      | field                     | malformed                        |
      | mode                      | a string rather than an array    |
      | stages[0].artifact        | a number                         |
      | stages[0].unlocks            | an array containing a number  |
      | stages[0].scoring.dimensions | absent                        |
      | stages[0].scoring.dimensions | set to an empty array         |
      | stages[0].gate               | requires_signoff set to a string |

  Scenario: A bearing with no stages is rejected
    Given a journey bearing whose stages array is empty
    When it is parsed
    Then it throws with a message naming stages

  Scenario: Duplicate stage ids are rejected
    Given a journey bearing where two stages share an id
    When it is parsed
    Then it throws
    And the message names the duplicated id, because unlocks would otherwise be ambiguous

  Scenario: A stage missing its gate rule is rejected
    Given a stage whose gate omits rule
    When it is parsed
    Then it throws
    And the message carries the positional path stages[n].gate

  @wip
  Scenario: unlocks referential integrity is a recorded gap
    Given a stage unlocking an id that is not a stage in the same bearing
    When it is parsed
    Then it parses, because resolving the reference needs the whole bearing set
    And M2 owns the check
```

```gherkin
Feature: Standing profile — with SAV-121's two fixes
  Targets, rhythms and initiatives, plus a materialised direction and a daily cadence

  Background:
    Given a standing bearing with a valid envelope

  Scenario: The standing fixture exercises all three facets
    Given fixtures/standing-example.yaml
    When it is parsed
    Then targets, rhythms and initiatives all validate
    And both comparator directions and all three cadences are covered

  Scenario: A target without direction gets gte materialised
    Given a target omitting direction
    When it is parsed
    Then the output carries direction set to gte
    And this is the single deliberate exception to the omit-absent-keys rule

  Scenario: An invalid direction is rejected
    Given a target whose direction is neither gte nor lte
    When it is parsed
    Then it throws with a message naming direction and the offending value

  Scenario: The daily cadence parses with its own anchor
    Given a rhythm with cadence daily and reset local-day
    When it is parsed
    Then it parses

  Scenario Outline: Cadence and reset anchor must agree
    Given a rhythm pairing cadence <cadence> with reset <reset>
    When it is parsed
    Then it throws
    And the message names <cadence> and the expected anchor <expected>

    Examples:
      | cadence | reset     | expected  |
      | daily   | monday    | local-day |
      | weekly  | first     | monday    |
      | weekly  | local-day | monday    |
      | monthly | monday    | first     |

  Scenario: Optional standing fields are accepted and omitted cleanly
    Given a target declaring target.period and actual.goal_tool and actual.actual_tool
    And a rhythm declaring count
    When it is parsed
    Then each value survives unchanged
    And a bearing omitting all four parses with no key for any of them

  Scenario Outline: A malformed target or rhythm field is rejected by path
    Given a standing bearing where <field> is <malformed>
    When it is parsed
    Then it throws a BearingValidationError
    And the message carries the positional path <field>

    Examples:
      | field                              | malformed              |
      | targets[0].tier                    | a tier outside A, B, C |
      | targets[0].confirmed               | a string               |
      | targets[0].target.period           | a number               |
      | targets[0].actual                  | absent                 |
      | targets[0].actual.source           | absent                 |
      | targets[0].actual.goal_tool        | a number               |
      | targets[0].actual.actual_tool      | a number               |
      | rhythms[0].count                   | a string               |
      | initiatives[0].milestones[0].label | absent                 |

  @wip
  Scenario: The Tier C tool-ref rule is a recorded gap
    Given a target whose actual.source is none and which also names a goal_tool
    When it is parsed
    Then it parses, because v2 validates the tool refs as optional strings only
    And the conditional is documented in the schema spec as a gap beside unlocks
```

```gherkin
Feature: Serialization guarantee
  Parsed bearings survive being baked into a generated TypeScript module

  Scenario: A parsed bearing survives a JSON round trip
    Given each of the two fixtures
    When the parsed value is passed through JSON.stringify and JSON.parse
    Then the result deep-equals the original parsed value

  Scenario: No key is set to undefined at any depth
    Given each of the two fixtures parsed
    When the result is walked recursively
    Then no own key anywhere holds the value undefined
    And absent optional fields are omitted keys instead

  Scenario: No unserializable value reaches the output
    Given each of the two fixtures parsed
    When the result is walked recursively
    Then it contains only plain objects, arrays, strings, numbers and booleans
    And no class instance, Map, Set or Date
```
