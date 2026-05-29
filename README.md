# AI Compiler Demo

A modular system that transforms natural language product requirements into strict application configuration and runtime-aware output.

## Features

- Multi-stage pipeline: intent extraction, system design, schema generation, refinement, validation, repair
- Strict JSON contracts with cross-layer consistency checks
- Deterministic, rule-based generation for reproducibility
- Runtime-aware output: generated config can power an Express server and simple UI mock
- Evaluation dataset with real and edge-case prompts

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the demo server:

```bash
npm run dev
```

Then open `http://localhost:4000`.

3. Run evaluation:

```bash
npm run evaluate
```
