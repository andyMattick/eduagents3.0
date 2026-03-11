# eduagents3.0

An intelligent educational assessment pipeline that transforms static assignments into dynamic, multidimensional simulations for actionable student feedback and adaptive content generation.

## Overview

eduagents3.0 decomposes educational assessments into **problems** (Asteroids), evaluates them against **student profiles** (Astronauts) through a unified simulation engine, and produces analytics-driven rewrites for improved pedagogical quality.

## Key Features

- **Problem Decomposition**: Extract and tag assignments with Bloom's taxonomy, linguistic complexity, and novelty scores
- **Student Profiling**: Model learner personas with accessibility overlays and trait profiles
- **Simulation-Driven Feedback**: Generate realistic student-problem interactions producing aggregated analytics
- **Iterative Refinement**: Rewrite problems for clarity, difficulty, and accessibility based on simulation output
- **Incident Reporting**: Deterministic admin-readable reports from enriched assessments

## Development

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Starts Vite dev server on port 5173.

### Build

```bash
npm run build
```

### Testing

```bash
npm test
```

## Architecture

### Pipeline Phases

1. **Ingestion**: Document parsing (PDF, Word, plain text) → problem extraction
2. **Analysis**: Tag extraction, Bloom classification, metadata enrichment
3. **Simulation**: Student persona evaluation against problem set
4. **Rewriting**: Adaptive content generation based on simulation results
5. **Export**: Final assessment assembly and reporting

### Key Components

- **Pipeline Orchestrator** (`src/pipeline/orchestrator/`) — Coordinates all stages
- **Architect** (`src/pipeline/architectV3/`) — Assessment planning and feasibility analysis
- **Writer** (`src/pipeline/agents/writer/`) — Problem generation and rewriting
- **Gatekeeper** (`src/pipeline/agents/gatekeeper/`) — Validation and quality gates
- **Scribe** (`src/pipeline/agents/scribe/`) — Final assessment output

## License

Proprietary

  ```sh
  sudo dpkg -i <...>.deb
  ```

  ```sh
  sudo rpm -i <...>.rpm
  ```

  ```sh
  sudo pacman -U <...>.pkg.tar.zst
  ```
</details>

<details>
  <summary><b>Other Platforms</b></summary>

  You can also install the CLI via [go modules](https://go.dev/ref/mod#go-install) without the help of package managers.

  ```sh
  go install github.com/supabase/cli@latest
  ```

  Add a symlink to the binary in `$PATH` for easier access:

  ```sh
  ln -s "$(go env GOPATH)/bin/cli" /usr/bin/supabase
  ```

  This works on other non-standard Linux distros.
</details>

<details>
  <summary><b>Community Maintained Packages</b></summary>

  Available via [pkgx](https://pkgx.sh/). Package script [here](https://github.com/pkgxdev/pantry/blob/main/projects/supabase.com/cli/package.yml).
  To install in your working directory:

  ```bash
  pkgx install supabase
  ```

  Available via [Nixpkgs](https://nixos.org/). Package script [here](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/tools/supabase-cli/default.nix).
</details>

### Run the CLI

```bash
supabase bootstrap
```

Or using npx:

```bash
npx supabase bootstrap
```

The bootstrap command will guide you through the process of setting up a Supabase project using one of the [starter](https://github.com/supabase-community/supabase-samples/blob/main/samples.json) templates.

## Docs

Command & config reference can be found [here](https://supabase.com/docs/reference/cli/about).

## Breaking changes

We follow semantic versioning for changes that directly impact CLI commands, flags, and configurations.

However, due to dependencies on other service images, we cannot guarantee that schema migrations, seed.sql, and generated types will always work for the same CLI major version. If you need such guarantees, we encourage you to pin a specific version of CLI in package.json.

## Developing

To run from source:

```sh
# Go >= 1.22
go run . help
```
