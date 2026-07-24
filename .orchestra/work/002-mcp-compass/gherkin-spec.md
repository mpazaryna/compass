# Gherkin Scenarios: MCP Server — Compass Serves Bearings Over a Connector

> Source: ./spec.md
> Generated: 2026-07-24

Split into four features (the spec spans more than seven scenarios): the tool
surface, the transport, the build-time bake, and deployment/connector. They map
onto the spec's unit / integration / E2E tiers.

## Feature: Serving bearings over the tool surface (unit)

```gherkin
Feature: Serving bearings over the tool surface
  The pure handleTool layer answers list_bearings, get_bearing, and get_stage
  over the baked bearing set.

  Background:
    Given the Compass server has baked the journey and standing example bearings

  Scenario: List the available bearings
    When a client calls the list_bearings tool
    Then the result lists each bearing's slug, name, and profile
    And it includes both the journey and the standing example

  Scenario: Fetch a bearing by slug
    When a client calls get_bearing with the slug brand-builder
    Then the result is the full parsed journey bearing
    And its materialised fields are present

  Scenario: Fetch an unknown bearing
    When a client calls get_bearing with a slug that was not baked
    Then the result is flagged as an error
    And the message names the missing slug

  Scenario: Fetch a journey stage
    Given the journey bearing brand-builder has a stage discovery
    When a client calls get_stage with that bearing and stage
    Then the result is the stage prompt and gate

  Scenario: Fetch a stage from a standing bearing
    Given the standing bearing example-standing has no stages
    When a client calls get_stage on it
    Then the result is flagged as an error
    And the message explains that stages are journey-only

  Scenario: Fetch an unknown stage
    When a client calls get_stage with a known bearing and an unknown stage id
    Then the result is flagged as an error
    And the message names the missing stage
```

## Feature: MCP transport over Streamable HTTP (integration)

```gherkin
Feature: MCP transport over Streamable HTTP
  The Worker speaks JSON-RPC over a single /mcp endpoint in the real workerd
  runtime.

  Background:
    Given the Compass MCP Worker is running

  Scenario: Initialize the session
    When a client posts an initialize request to /mcp
    Then the server returns its protocol version and tool capability
    And it returns methodology instructions that do not describe software development

  Scenario: List the tools
    When a client posts a tools/list request
    Then the server returns list_bearings and get_bearing and get_stage

  Scenario: Acknowledge a notification
    When a client posts a notification that carries no id
    Then the server responds with 202 and no body

  Scenario: Reject a GET on the endpoint
    When a client sends a GET request to /mcp
    Then the server responds with 405

  Scenario: Reject an unknown tool
    When a client calls tools/call with a tool name the server does not expose
    Then the server returns a JSON-RPC method-not-found error
```

## Feature: Baking bearings at build time (integration)

```gherkin
Feature: Baking bearings at build time
  build-bearings.mjs parses and validates every bearing at build time so the
  Worker ships plain data and no parser.

  Background:
    Given the build-bearings bake script and the example fixtures

  Scenario: Bake parsed and validated bearings
    When the bake runs against the fixtures
    Then the generated module's objects deep-equal loadBearing of the same files

  Scenario: Fail the build on a malformed bearing
    Given a bearing that fails validation
    When the bake runs
    Then the build fails with the validation error
    And no generated module is written for the bad set

  Scenario: Ship no parser to the Worker
    When the Worker's runtime modules are scanned
    Then they import neither the yaml package nor the parseBearing module
```

## Feature: Deploying and connecting (functional and E2E)

```gherkin
Feature: Deploying and connecting
  The Worker is stateless, deploys to the shared account, and completes the
  connector handshake a client relies on.

  Scenario: Stateless worker configuration
    Given the wrangler configuration
    When it is inspected for stateful bindings
    Then it declares no KV, Durable Object, R2, or D1 binding

  Scenario: Deploy to the shared account
    Given a clean build
    When pnpm run deploy runs
    Then the bearings are baked and the Worker is deployed to the shared Cloudflare account
    And the deploy prints a reachable endpoint URL

  Scenario: Complete the connector handshake over HTTP
    Given a running Compass Worker reached over real HTTP
    When a client runs initialize then tools/list then tools/call get_stage in sequence
    Then each response has the expected JSON-RPC shape

  @manual
  Scenario: Connect from Claude Desktop
    Given the deployed Worker URL
    When the URL is added as a custom connector in Claude Desktop with no auth
    Then the client can list the bearings and open one
```
