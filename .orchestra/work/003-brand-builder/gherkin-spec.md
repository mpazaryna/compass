# Gherkin Scenarios: Brand Builder — A Bearing That Guides a Live Q&A

> Source: ./spec.md
> Generated: 2026-07-24

```gherkin
Feature: Brand Builder — A Bearing That Guides a Live Q&A
  Compass serves a minimal two-stage Brand Builder bearing and, through the
  initialize instructions, drives a person through a couple of question-and-answer
  rounds rather than generating a document.

  Background:
    Given the Compass Worker bakes and serves the Brand Builder bearing

  Scenario: Serve the real bearing rather than the schema fixtures
    When a client calls list_bearings
    Then it returns the brand-builder bearing
    And it does not return the example schema fixtures

  Scenario: Open the discovery stage and get real questions
    When a client calls get_stage for the discovery stage of brand-builder
    Then it returns a real question-set prompt
    And the prompt is not the placeholder ellipsis

  Scenario: The gate and the hand-off between stages
    When the served bearing's stages are inspected
    Then the discovery stage unlocks the foundation stage
    And each stage requires sign-off at its gate

  Scenario: The instructions tell the client to run the journey
    When a client reads the initialize instructions
    Then they direct asking the stage's questions one exchange at a time
    And they forbid answering for the person or skipping ahead
    And they contain no software development language

  @manual
  Scenario: A person is guided through a couple of Q&A rounds
    Given the deployed bearing reached from Claude Desktop
    When the person starts the Brand Builder
    Then Compass asks the discovery questions one at a time and waits for answers
    And it reaches the discovery gate before opening the foundation stage
```
