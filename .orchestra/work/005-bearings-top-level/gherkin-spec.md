# Gherkin Scenarios: Bearings Live at the Top Level

> Source: .orchestra/work/005-bearings-top-level/spec.md
> Generated: 2026-07-28

```gherkin
Feature: Bearings Live at the Top Level
  Authored bearings live at the repository root, one folder per bearing, and the
  build bakes that shape without changing anything a client receives.

  Background:
    Given a top-level "bearings" directory at the repository root
    And each bearing is a folder holding a "bearing.yaml" and a "README.md"

  Scenario: The build bakes a bearing from its own folder
    Given the Brand Builder lives at "bearings/brand-builder/bearing.yaml"
    And a "README.md" beside it explains the journey and its drafted prompts
    When the build bakes the bearing set
    Then the baked set equals the loaded contents of that bearing file
    And the served Brand Builder still opens at discovery and unlocks foundation
    And every served stage prompt is real question-set content, not a placeholder

  Scenario: The move changes nothing a client receives
    Given the baked module was recorded before the bearing was moved
    When the bearing set is baked again from the top-level location
    Then the baked module is byte-identical to the recorded one
    And the connector handshake against the deployed instrument passes with no
      change to its assertions
    And listing bearings in a connected client still returns the Brand Builder
    And opening the discovery stage still returns its real prompt

  Scenario: Adding an engagement takes no code change
    Given an author who has never opened the server application
    When they add a new folder under "bearings" containing a valid bearing file
    And the build bakes the bearing set
    Then the new bearing is baked and served alongside the Brand Builder
    And no source file outside the bearings directory was edited

  Scenario: A bearing folder with no bearing file fails the build
    Given a bearing folder that holds only a README and no bearing file
    When the build bakes the bearing set
    Then the build fails
    And the message names the folder and the missing "bearing.yaml"
    And the message states that each bearing is a directory containing a
      bearing file

  Scenario: A bearing file left loose at the top fails the build
    Given a bearing file sitting directly in the bearings directory rather than
      inside a folder
    When the build bakes the bearing set
    Then the build fails
    And the message names the loose file
    And the message states where a bearing belongs
    And the loose file is never silently skipped

  Scenario: A malformed bearing still fails the build
    Given a bearing folder whose bearing file is missing a required field
    When the build bakes the bearing set
    Then the build fails
    And the message names the missing field

  Scenario: Schema-test fixtures are not treated as content
    Given the example bearings that live with the loader as test data
    When the build bakes the bearing set
    Then those examples are not baked and not served
    And they remain where they are, outside the bearings directory
```
