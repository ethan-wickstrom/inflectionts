# Guide mapping

This file records how each page of three documentation guides was applied to inflectionts: the [Write the Docs guide](https://www.writethedocs.org/guide/), [Diátaxis](https://diataxis.fr/), and Addy Osmani's [Agentic Engine Optimization](https://addyosmani.com/blog/agentic-engine-optimization/). Each page lists the rules taken from it (quotes copied from `pages.md`, fetched 2026-11-20) and the change that applies them, naming the file and commit. Every claim was checked against the file at commit 823ddf3.

A page counts as applied when at least half of its applicable rules are followed. "Partly" marks a page with a gap, and its entry says what is missing. A page counts as not done when most of its applicable rules are not followed.

## Summary

| Source                                                                                                | Pages  | Applied | Not applicable | Not done |
| ----------------------------------------------------------------------------------------------------- | ------ | ------- | -------------- | -------- |
| [Write the Docs guide](https://www.writethedocs.org/guide/)                                           | 33     | 21      | 11             | 1        |
| [Diátaxis](https://diataxis.fr/)                                                                      | 19     | 15      | 4              | 0        |
| [Agentic Engine Optimization (Addy Osmani)](https://addyosmani.com/blog/agentic-engine-optimization/) | 1      | 1       | 0              | 0        |
| **Total**                                                                                             | **53** | **37**  | **15**         | **1**    |

## Part 1: Write the Docs guide (site order of https://www.writethedocs.org/guide/)

### 1.1 Software documentation guide (index)

- URL: https://www.writethedocs.org/guide/
- Rules:
  - Docs as code means writing docs with "issue trackers, version control, plain text files, code review and automated tests". Keep docs in the repo as Markdown and gate them in CI.
  - Good docs are "skimmable, exemplary, consistent, current and discoverable". This is the index summary of the principles page (1.5).

**Change in repo (Applied):** All user docs are Markdown in the repo (README.md, docs/tutorial.md, docs/how-to.md, docs/explanation.md; split out in d784cdd) and are tested: packages/inflectionts/scripts/check-docs.ts type-checks and runs every `ts` block and compares it with the following `output` block, and docgen runs every JSDoc `@example` (b895aaf). Both run in `bun run docs`, which is the last step of `bun run check`. That command runs in .githooks/pre-commit (ccf289d), .github/workflows/check.yml (a3831b1), and the `docs` check in flake.nix. Rule 2 is covered page by page under 1.5.

### 1.2 How to write software documentation (beginner's guide; includes the README template)

- URL: https://www.writethedocs.org/guide/writing/beginners-guide-to-docs/
- Rules:
  - The README must cover the three reasons people won't use code: "They don't know why your project exists", "They can't find how to install your code", "They can't see how to use your code." Open the README with "clearly state what your project does and why", then "Provide a small code example" of "a common example use case".
  - "Keep your install instructions to a couple of lines for the basic case. Link to a page with more information and any caveats." For example, `bun add inflectionts` in the README, with the Nix/dev setup moved elsewhere.
  - Follow the README template sections: description, short example, Features, Installation, Contribute (issue tracker and source links), Support, License. "State your project's license" and "only pick one standard license."
  - "know which of these common audiences you're writing for": Users ("don't care how it works") vs Developers ("want to contribute"). Split consumer docs from contributor docs. "beware of overusing Frequently Asked Questions (FAQs)" because they "Become quickly outdated."

**Change in repo (Applied):** Partly. README.md (d784cdd, a3831b1) opens with what the library does and for whom, then a runnable example with its `output` block. Install is one line (`bun add inflectionts effect`) plus one line on the peer dependency, and the Nix/dev setup moved to CONTRIBUTING.md. README has a License section (MIT, one license; LICENSE added in 3de7f7a), a Contributing link, and no FAQ. Consumer docs (README, docs/) are split from contributor docs (CONTRIBUTING.md, AGENTS.md). The README has a Support section linking GitHub Issues and a Command line section (review fixes). There is no separate Features heading; the opening sentence lists the features instead. Missing: the install line does not work yet: `npm view inflectionts` returns 404 (checked 2026-11-21). The README says so up front and gives a from-clone tarball route that was run in a clean shell.

### 1.3 Getting started: documentation best practices for developers

- URL: https://www.writethedocs.org/guide/starting/
- Rules:
  - A routing page only: "Good documentation improves the chance of someone discovering and using your code". For open source it points back to 1.2. Nothing new beyond 1.2.

**Change in repo (Not applicable):** Not applicable: routing page with no rule beyond 1.2, which is mapped above.

### 1.4 Building documentation mindshare in a company

- URL: https://www.writethedocs.org/guide/writing/mindshare/
- Rules:
  - "Build a taxonomy": you need an answer to the "Where do I put it?" question. Write down in AGENTS.md/CONTRIBUTING where each kind of doc lives (README vs docs/ vs TSDoc).
  - "have a standard hierarchy for the docs, so that people know where to look for things in any project". Use the same docs layout for `packages/inflectionts` and `apps/cli`.
  - The rest (meetings, getting buy-in in engineering) is organizational and does not apply to a solo library.

**Change in repo (Applied):** Partly. Where each kind of doc lives is written down in three places: the README "Documentation" section (tutorial, how-to, explanation, API reference in `src/*.ts`, contributing), the CONTRIBUTING.md "Layout" table (d784cdd), and the AGENTS.md "Where things are" list (7a7b7e9). Missing: `apps/cli` does not follow the same layout. It has no README of its own; it is documented by the README "Command line" section (subcommand list, how to run it) and by `--help`, which now has examples for every subcommand and links the README.

### 1.5 Documentation principles

- URL: https://www.writethedocs.org/guide/writing/docs-principles/
- Rules:
  - Current: "Consider incorrect documentation to be worse than missing documentation." Make every README example executable and tested. Prefer "version-agnostic" content, so don't hard-code version numbers in prose.
  - Nearby and Unique: "Store sources as close as possible to the code which they document". Also "Eliminate content overlap between separate sources", so each fact has one owning source (for example, the API contract lives in TSDoc and the README links to it rather than restating it).
  - Skimmable and Exemplary: "Headings — should be descriptive and concise". Links never say "click here" or "this page". "Try to write examples for the most common use cases, but not for everything", and consider "separating examples and tutorials from more dense reference information". Cumulative: "put the tutorials and examples first".
  - Complete, Discoverable, and Addressable: "cover concepts in full, or not at all". A partial list is worse than none ("A map that displays fifty out of one hundred fire hydrants ... is worse than a map that displays none"). If a reference is partial, "clearly state, up front" that it is partial. "Funnel users intuitively towards publications through all likely pathways": point to the docs from npm metadata, CLI `--help`, and AGENTS.md. Use stable heading anchors.

**Change in repo (Applied):** Partly. Current: every `ts` block in README.md, docs/, and skills/inflectionts/SKILL.md runs with exact output in packages/inflectionts/scripts/check-docs.ts (d784cdd, 7a7b7e9), and the API `@example`s run through docgen (b895aaf). Unique: the API contract lives in JSDoc and the README links to the source files rather than restating it. Skimmable: headings are descriptive, docs/how-to.md has an anchor TOC, examples come before explanation, and no link says "click here" or "this page" (checked with rg). Funnel: packages/inflectionts/package.json has `homepage`/`bugs`/`repository` (b895aaf), and AGENTS.md names the human docs. Missing or not followed: (1) versions are hard-coded in prose: README `^4.1.4`, CONTRIBUTING.md and AGENTS.md `Bun 1.4.5` and `Effect 4.1.4`, docs/tutorial.md "Bun 1.4 or later". (2) Fixed: the README now scopes the tested-example claim to the operations in Inflector.ts and says Schema.ts and Errors.ts have no examples. It used to say every export is documented "with an example that runs in CI". That holds for the 29 operations in Inflector.ts, but the seven `apply*` functions, `makeInflector`, and every export in Schema.ts and Errors.ts have no `@example`, and the partial coverage is not stated up front. (3) Fixed: `inflect --help` (apps/cli/src/Cli.ts) now links the README. (4) The README, SKILL.md, and how-to examples overlap. (5) Fixed: .githooks/pre-commit used to say "the project remote runs no CI"; it now says it runs the same gates as CI.

### 1.6 Conquering imposter syndrome

- URL: https://www.writethedocs.org/guide/imposter/
- Rules:
  - Mostly career advice for technical writers. Usable points: write for "Beginners who are just getting started", "Intermediate or advanced users trying out something new", and "Any type of user who tried to do something and got stuck". Also "a step that may be glaringly obvious to a power user could seriously stump a beginner" (for example, spell out providing `Inflector.layer`).
  - "The Definition of Done can include meaningful documentation". A PR that changes public API is not done until the docs change too.

**Change in repo (Applied):** docs/tutorial.md (d784cdd) spells out the step a beginner can miss: "`Effect.provide(Inflector.layer)` gave it the inflector it needs, and `Effect.runSync` ran it." Definition of done: AGENTS.md "Rules the checks don't catch" (7a7b7e9) says "When behavior changes, update the `@example`, the docs blocks, and `PARITY.md` in the same commit". check-docs.ts and docgen fail `bun run check` when an example no longer matches.

### 1.7 Style Guides

- URL: https://www.writethedocs.org/guide/writing/style-guides/
- Rules:
  - "A style guide can be something as simple as a list of decisions you've made about how to refer to different items you frequently write about". Keep a short terminology list in AGENTS.md (for example _plural noun_, _classical mode_, `Inflector` service, _layer_).
  - API docs: "If a feature is not documented, it does not exist. If a feature is documented incorrectly, then it is broken." Also "Documentation cannot fix a poorly designed API." Test-driven documentation means "if the API's documentation becomes inconsistent with its implementation, the tests that generate the snippets will fail."
  - Error messages (applies to the `Schema.TaggedError` messages and CLI errors): "Make the message short and meaningful", "Include precise descriptions of exact problems", "Offer constructive advice on how to fix the problem", "Don't blame the user".
  - Release notes "should be brief, linking out to more details as necessary". Each entry answers "What is the specific change?" and "Why did we make this change?". Follow CLI style resources (CLIG, Heroku CLI Style Guide) for `apps/cli` help text.

**Change in repo (Applied):** Partly. Rules 2 and 3 are applied; rules 1 and 4 are not. Applied: API examples are tests (docgen `runExamples` in packages/inflectionts/docgen.json, b895aaf; check-docs.ts for Markdown), so an example that drifts from the implementation fails the build. Not done: (1) AGENTS.md has no terminology list. (3) Error messages in packages/inflectionts/src/Inflector.ts and src/internal/ are short, precise, and include the bad input (for example `Unknown classical mode '${key}'`), but most do not say how to fix the problem. Fixed: the classical-mode and gender messages now list the valid values (`Unknown classical mode 'bogus'; expected one of: all, zero, herd, names, persons, ancient`), like the `group` message, and a test pins them. Fixed: CLI errors print one line without a stack trace (handlers map failures to `CliError.UserError`), and `inflect singular horse` suggests `--fallback`. A test checks stderr has no `at` frames. (4) There are no release notes or CHANGELOG. apps/cli/src/Cli.ts gives each subcommand a description and `withExamples`, but no CLI style guide was applied.

### 1.8 Accessibility guidelines: for writing and beyond

- URL: https://www.writethedocs.org/guide/writing/accessibility/
- Rules:
  - Mostly a list of external resources. The one rule: "if the content design is simple, concise, and clear you are already doing a lot for both a11y and localization". Also make sure "content is organized" so screen readers can navigate it, which means a correct heading hierarchy in the Markdown.

**Change in repo (Applied):** README.md, docs/*.md, CONTRIBUTING.md, and AGENTS.md use one H1 and then H2 (and `###` only under H2), and the prose is short sentences. No accessibility-specific change was made beyond this. The README title and logo are raw HTML (`<h1 align="center">`, logo `alt=""`, a3831b1); the h1 is still a real heading.

### 1.9 Reducing bias in your writing

- URL: https://www.writethedocs.org/guide/writing/reducing-bias/
- Rules:
  - "Even thinking twice about what example user names you include in your documentation can help reduce bias". Review the example names and nouns in README and test examples, and the pronoun-gender examples (`applyGender`). The rest of the page is a resource list.

**Change in repo (Not done):** Not done: no review of example names was made. Current state, from reading the files: examples use no personal names (nouns such as "Person", "Cactus", "pokémon", "VAX"). The pronoun example in `gender`'s JSDoc uses "feminine" (they → she). The CLI default gender is `neuter`, and `gender-neutral` is one of its choices (apps/cli/src/Cli.ts).

### 1.10 Producing documentation inside a Support team

- URL: https://www.writethedocs.org/guide/writing/support-team/
- Nothing applicable: the page is about combining support-agent and tech-writer roles in a SaaS team. The closest point is to turn repeated issue questions into a doc page or FAQ ("issues that resurface enough to create a doc page or FAQ").

**Change in repo (Not applicable):** Not applicable: support-team page. The repo has no issue history to turn into docs. The adoption and cold-start evals (evals/, 2bd0f42) do this job: c407da1 documented the singular-input pitfall they found.

### 1.11 UX writing

- URL: https://www.writethedocs.org/guide/ux-writing/
- Nothing applicable: the page is a list of external videos, books, and courses. Its only general claim is that microcopy (UI and error text) needs "clarity, consistency, precision". 1.7 covers this for CLI and error messages.

**Change in repo (Not applicable):** Not applicable: resource list; microcopy is covered under 1.7.

### 1.12 Docs as code

- URL: https://www.writethedocs.org/guide/docs-as-code/
- Rules:
  - Write docs with "Issue Trackers", "Version Control (Git)", "Plain Text Markup", "Code Reviews", and "Automated Tests".
  - "You can block merging of new features if they don't include documentation". Enforce this in the pre-commit hook or a Nix flake check (for example, run README examples as tests or check that exports have TSDoc). The rest of the page lists talks.

**Change in repo (Applied):** Git, plain-text Markdown, and automated tests: packages/inflectionts/scripts/check-docs.ts, docgen with `enforceDescriptions`/`enforceVersion`/`runExamples` in packages/inflectionts/docgen.json (b895aaf), and the `docs` flake check. The block is in .githooks/pre-commit (ccf289d) and .github/workflows/check.yml (a3831b1). A public export with no JSDoc description or `@since` fails docgen, and a doc example that no longer matches fails the check. The issue tracker is GitHub, linked from `bugs.url` in package.json. Code review is not enforced: there is no PR template or branch protection in the repo.

### 1.13 DocOps

- URL: https://www.writethedocs.org/guide/doc-ops/
- Rules:
  - DocOps is "a set of practices that works to automate and integrate the process of developing documentation". For this repo that means treating the docs build or checks as flake checks, "Creating and maintaining build scripts", and "Keeping the barrier to entry for making docs low to make contributing easy". Most of the page is about team roles.

**Change in repo (Applied):** Docs checks are build scripts and flake checks: `docs = mkSandboxedCheck "docs" ... "bun run docs"` in flake.nix, and `bun run docs` runs docgen plus packages/inflectionts/scripts/check-docs.ts. The barrier to entry is one command: `bun run check`, with scripts/preflight printing how to install the right Bun (0073744).

### 1.14 Introduction to Markdown

- URL: https://www.writethedocs.org/guide/writing/markdown/
- Rules:
  - A syntax primer, so little policy. The applicable points: "If you have longer documents, it is better to give them some structure, which you can actually achieve with headers". Use fenced code blocks ("3 apostrophes opening and closing your code block") for examples. Only "cheat" with raw HTML when Markdown is too limited.

**Change in repo (Applied):** All docs use headers and fenced code blocks with info strings (`ts`, `output`, `sh`), which check-docs.ts relies on. README.md uses raw HTML only for the centered logo, title, and badges (a3831b1), which Markdown cannot center.

### 1.15 Introduction to reStructuredText

- URL: https://www.writethedocs.org/guide/writing/reStructuredText/
- Nothing applicable: this is an rST syntax primer, and the repo uses Markdown.

**Change in repo (Not applicable):** Not applicable: reStructuredText primer; the repo uses Markdown.

### 1.16 Introduction to XML

- URL: https://www.writethedocs.org/guide/writing/xml/
- Nothing applicable: this is an XML primer with no relevance to a Markdown/TSDoc library.

**Change in repo (Not applicable):** Not applicable: XML primer; no XML docs in the repo.

### 1.17 Introduction to AsciiDoc

- URL: https://www.writethedocs.org/guide/writing/asciidoc/
- Nothing applicable: this is an AsciiDoc syntax primer, and the repo uses Markdown.

**Change in repo (Not applicable):** Not applicable: AsciiDoc primer; the repo uses Markdown.

### 1.18 Choosing tools for documentation

- URL: https://www.writethedocs.org/guide/choosing-tools/
- Rules:
  - "Usually, you are better off leaning in to what is already available rather than trying to spin up something new". Use GitHub-rendered Markdown and TSDoc rather than adding a static site generator to a small library. "Static Site Generators ... the time spent spinning them up may cost as much as investing in a commercial tool."
  - "Plan who will be responsible for long term maintenance" and "Make sure you have a plan in place for managing link maintenance", for example a link check in CI.
  - "Your content may need to be made available to third party clients or other software consumers that repackage it". npm and jsr render the README, and agents read raw Markdown.

**Change in repo (Applied):** Partly. No static site generator: docs are GitHub-rendered Markdown plus JSDoc. The docgen output in `packages/inflectionts/docs` is gitignored and only rendered locally by `bun run docs`. For repackagers, README links are absolute so they work on npmjs.com (a3831b1), and packages/inflectionts/scripts/pack.ts copies the repository README.md and LICENSE into the tarball (3de7f7a). Missing: there is no link check and no written plan for link maintenance.

### 1.19 Tools for documentation writing

- URL: https://www.writethedocs.org/guide/tools/
- Rules:
  - A hub page (Sphinx-focused). The applicable part is its "Testing and quality" list: continuous integration, build errors, link testing, and "Style guide checking and linting" with Vale. See 1.22.

**Change in repo (Applied):** Partly: CI and build errors are covered; link testing and prose linting are not done. See 1.23.

### 1.20 Introduction to Sphinx

- URL: https://www.writethedocs.org/guide/tools/sphinx/
- Rules:
  - Sphinx is a Python toolchain, so it does not apply directly. One transferable rule: when adding a doc page, "make sure it is included in a toctree"; every doc file must be linked from an index (the README docs section). Also "figure out if there is already a place for it in the project, otherwise feel free to start a new file."

**Change in repo (Applied):** Every user doc is linked from the README "Documentation" section (tutorial, how-to, explanation, the three API source files, CONTRIBUTING, PARITY.md under "Compatibility"). evals/ is linked from the CONTRIBUTING.md layout table. llms.txt and skills/inflectionts/SKILL.md are not linked from README; llms.txt links SKILL.md.

### 1.21 Sphinx themes

- URL: https://www.writethedocs.org/guide/tools/sphinx-themes/
- Nothing applicable: this is a list of Sphinx HTML themes, and the repo has no Sphinx site.

**Change in repo (Not applicable):** Not applicable: Sphinx theme list; no Sphinx site.

### 1.22 Community perspectives on Sphinx

- URL: https://www.writethedocs.org/guide/tools/sphinx-community/
- Rules:
  - Mostly Sphinx-specific. Transferable lesson: docs that are "comprehensive but geared toward reference rather than learning" leave new users needing "supplementary tutorials". A reference-only README needs a getting-started path.

**Change in repo (Applied):** The README is no longer reference-only. docs/tutorial.md gives a getting-started path, and the README links it first (d784cdd).

### 1.23 Testing your documentation

- URL: https://www.writethedocs.org/guide/tools/testing/
- Rules:
  - "The most useful tests are run on each commit of your project." Run docs checks in the pre-commit hook and in `nix flake check`.
  - "The easiest automated check to do is to make sure your documentation builds properly". For this repo, that means type-checking or running the README and TSDoc examples.
  - Link testing: "Making sure all the hyperlinks in your docs are working is a really great place to start".
  - Linting prose: linters are "useful for enforcing a style guide, or for catching commonly mistaken branding issues". Vale config goes at "the root of your repository".

**Change in repo (Applied):** Partly. Rules 1–2 applied: `bun run check` ends with `bun run docs` (docgen runs every `@example`; check-docs.ts type-checks and runs every `ts` block with expected output). It runs on each commit through .githooks/pre-commit (ccf289d), on push and PR through .github/workflows/check.yml (a3831b1), and in `nix flake check`. Rules 3–4 not done: no link checker and no Vale or other prose linter. `sh` blocks (install and setup commands) are not run.

### 1.24 Search engine optimization (SEO) for documentation

- URL: https://www.writethedocs.org/guide/seo/
- Rules:
  - "Write imperative, user-centric, goal-oriented headings" (for example _Pluralize a noun with a count_ rather than `pluralNoun`).
  - "Make your docs skimmable by breaking content into sections under appropriate headings". Also "Focus on good information architecture".
  - The page-metadata rule (`<head>` last-modified) applies only if a docs site is published.

**Change in repo (Applied):** docs/how-to.md headings are imperative and goal-oriented ("Label a count with any noun", "Teach it a word it gets wrong") rather than function names, with a TOC of anchors (d784cdd). Rule 3 does not apply: no docs site is published.

### 1.25 API documentation tools

- URL: https://www.writethedocs.org/guide/api/api-documentation-tools/
- Rules:
  - The page is about HTTP API description languages (OpenAPI, API Blueprint, Apiary), which don't apply to a TypeScript library. The transferable rule is to make the API description machine-checked: "you don't have to manually validate your documents" when a tool checks them against the implementation. Here the TS types and Effect `Schema` play that role, together with type-checked examples.

**Change in repo (Applied):** The API description is machine-checked: TypeScript signatures with typed error channels, and docgen type-checks and runs each JSDoc `@example` against the source (packages/inflectionts/docgen.json, b895aaf).

### 1.26 About Write the Docs

- URL: https://www.writethedocs.org/guide/about/
- Nothing applicable: it lists links to the organisation's own pages.

**Change in repo (Not applicable):** Not applicable: list of Write the Docs organisation links.

### 1.27 Vision

- URL: https://www.writethedocs.org/guide/about/vision/
- Rules:
  - A mission statement with one usable rule: "Documentation should be written in a way that allows it to be translated easily". Use plain sentences without idioms (this ties in with the animal-idiom note in 1.7).

**Change in repo (Applied):** Partly; no dedicated change. The docs are short, plain sentences. No translation-focused review was done, and a few idioms remain ("Teach it a word it gets wrong", "at the edge of the program").

### 1.28 Interesting approaches to documentation

- URL: https://www.writethedocs.org/guide/about/alternatives/
- Mostly not applicable: it is a list of external example links. One idea transfers: Riak's "side by side comparison" of a paper and their implementation, which suggests documenting how inflectionts diverges from upstream `jaraco/inflect`.

**Change in repo (Applied):** packages/inflectionts/test/upstream/PARITY.md (c47940f) compares each upstream inflect test function with this port and lists the 19 deliberate differences. docs/explanation.md "About the relationship to Python's inflect" (d784cdd) summarizes it.

### 1.29 Documentation community

- URL: https://www.writethedocs.org/guide/about/community/
- Nothing applicable: it covers community channels (Slack, newsletter, GitHub).

**Change in repo (Not applicable):** Not applicable: community channels page.

### 1.30 Contributing to the Write the Docs guide

- URL: https://www.writethedocs.org/guide/contributing/
- Rules:
  - "Use a friendly and encouraging tone."
  - "Attribute links and mention why linked resources are useful."
  - "Avoid enforcing personal preferences. For example, if you recommend a word choice, tell the audience why it matters." For AGENTS.md rules, state the reason for each rule.

**Change in repo (Applied):** Partly. Tone is neutral and direct. README links say why they are useful (for example `pluralize` "is smaller and returns plain strings"). Most AGENTS.md rules state a reason (7a7b7e9), for example never `npm publish` in the package because "they ship the development `exports`". Missing: some rules give no reason, such as "Do not use `as`, `any`, or hand-written type guards" and the `Console` rule for scripts.

The next three Write the Docs pages appear only in the sitemap, not in the guide index (Appendix A in `pages.md`).

### A.1 Starting on a new piece of documentation

- URL: https://www.writethedocs.org/guide/Starting-a-new-doc/
- Rules:
  - Start by answering "What does the product do? What does it enable users to achieve?" and who the users are.
  - For "a software development kit with a number of APIs", "write a reference guide that describes what each API does and lists them alphabetically so that users can easily locate the information they need." Order an API reference of the inflectionts exports alphabetically or by group.

**Change in repo (Applied):** The README opening answers what the library does and for whom, and "When to use it, and when not to" says who should not use it (d784cdd). The API reference is grouped by `@category` (plurals, numbers, articles, custom rules, …) in packages/inflectionts/src/Inflector.ts (b895aaf). docgen renders the categories and the entries within them alphabetically (checked in the generated packages/inflectionts/docs/modules/Inflector.ts.md). Schema.ts exports have no `@category`.

### A.2 Presentations

- URL: https://www.writethedocs.org/guide/presentations/
- Nothing applicable: it links slide decks for evangelising documentation.

**Change in repo (Not applicable):** Not applicable: slide-deck links.

### A.3 Writing documentation as an open-source developer (moved)

- URL: https://www.writethedocs.org/guide/writing/oss/
- Nothing applicable: it is a redirect stub ("This document has been updated and moved to How to write software documentation"). See 1.2.

**Change in repo (Not applicable):** Not applicable: redirect stub to 1.2.

## Part 2: Diátaxis (site order of https://diataxis.fr/)

### 2.1 Diátaxis (home)

- URL: https://diataxis.fr/
- Rules:
  - There are "four distinct needs, and four corresponding forms of documentation - tutorials, how-to guides, technical reference and explanation". The docs "should itself be organised around the structures of those needs". Classify each README section and doc file into exactly one of the four.

**Change in repo (Applied):** d784cdd split the docs by need: docs/tutorial.md (learning), docs/how-to.md (goals), docs/explanation.md (understanding), and JSDoc in packages/inflectionts/src/*.ts as reference. The README is the landing page.

### 2.2 Start here - Diátaxis in five minutes

- URL: https://diataxis.fr/start-here/
- Rules:
  - Reference structure mirrors the code: "the architecture of reference documentation should reflect the structure or architecture of the thing it's describing". Group the API reference by module or export area (nouns, verbs, articles, numbers, ordinals, templates, state/layers).
  - Keep explanation out of tutorials: "give the learner the most minimal explanation ... and then link to an in-depth article".
  - Use the compass: content that informs action and serves acquisition of skill is a tutorial, and so on. Ask "action or cognition? acquisition or application?" for each section.
  - Workflow: "Decide on one thing you could do to it right now, however small, that would improve it.", then "Do that thing.", then "And then repeat."

**Change in repo (Applied):** Rule 1: reference follows the code structure, one module per file (Inflector.ts, Schema.ts, Errors.ts) and grouped by `@category` (b895aaf). Rule 2: docs/tutorial.md keeps explanation to two short paragraphs and links to docs/explanation.md. Rule 4: changes landed as small commits, each following an eval baseline (2bd0f42 → d784cdd, 7a7b7e9, c407da1). Rule 3 (compass) is mapped under 2.8.

### 2.3 Applying Diátaxis

- URL: https://diataxis.fr/application/
- Rules:
  - A section index. Its only rule: "Don't wait to understand Diátaxis before you start trying to put it into practice". "Iterate between your work and reflecting on your work."

**Change in repo (Applied):** Iteration is visible in history: the evals baselines (evals/results/, 2bd0f42, d784cdd) found friction, and c407da1 documented the singular-input pitfall that the adoption baseline found.

### 2.4 Tutorials

- URL: https://diataxis.fr/tutorials/
- Rules:
  - A tutorial is "a lesson". It must be "meaningful", "successful", "logical", and "usefully complete". Open with the destination ("In this tutorial we will ...") and not with "In this tutorial you will learn…".
  - "Every step the learner follows should produce a comprehensible result, however small". "Show the user actual example output, or even the exact expected output" (for example, show the exact string each `inflect` call returns).
  - "Ruthlessly minimise explanation" and "Ignore options and alternatives". Don't detour into classical mode or custom rules in the getting-started path.
  - "Aspire to perfect reliability": it should work "for every user, every time". Test the tutorial code in CI.

**Change in repo (Applied):** Partly. docs/tutorial.md (d784cdd) opens with the destination ("In this tutorial you write a small Bun program that prints a summary like ..."). Steps 2–4 each end in an `output` block with the exact output, explanation is minimal, and there is no classical mode or custom rules. Each `ts` block is run by check-docs.ts in CI. Not reliable for every user yet: step 1's `sh` block (`bun init`, `bun add inflectionts effect`) is not run by any check, and `bun add inflectionts` fails today because the package is not on npm (404 on 2026-11-21).

### 2.5 How-to guides

- URL: https://diataxis.fr/how-to-guides/
- Rules:
  - "How-to guides must be written from the perspective of the user, not of the machinery". They are "about goals, projects and problems, not about tools". Name tasks such as _How to add a custom plural rule_, not `defnoun`.
  - Titles: "Choose titles that say exactly what a how-to guide shows". Prefer "How to integrate application performance monitoring" over "Integrating ..." or a bare noun.
  - "action and only action", with "no digression, explanation, teaching". Link to reference for option lists ("Refer to the x reference guide for a full list of options").
  - Use conditional imperatives ("If you want x, do y"). It is fine to "start and end in some reasonable, meaningful place, and require the reader to join it up to their own work."

**Change in repo (Applied):** Partly. docs/how-to.md (d784cdd, c407da1) has ten guides named by goal ("Teach it a word it gets wrong", not `defnoun`). Each guide is a runnable program that starts and ends at a meaningful point, and conditional imperatives are used ("If you say it letter by letter, register it with `defan("FAQ")`"). Not fully followed: titles are imperatives, not "How to …". Some guides include explanation, such as why already-plural input fails, and "Use Latin and Greek plurals" lists the other modes inline instead of linking to reference.

### 2.6 Reference

- URL: https://diataxis.fr/reference/
- Rules:
  - "Describe and only describe". Reference should be "austere", in "neutrality, objectivity, factuality", and "structured according to the structure of the machinery itself".
  - "Adopt standard patterns". Reference "is useful when it is consistent". Use the same TSDoc block shape for every export (summary, params, returns, errors, example).
  - "Provide examples" (short usage examples, without explanation). List "commands, options, operations, features, flags, limitations, error messages". Provide warnings ("You must use a. You must not apply b unless c.").
  - Auto-generated reference "is a powerful way of ensuring that it remains faithfully accurate to the code", but "too many software developers think that auto-generated reference material is all the documentation required."

**Change in repo (Applied):** Partly. Every operation in packages/inflectionts/src/Inflector.ts has the same JSDoc shape (b895aaf): a one-line description, an `@example` that asserts results, then `@category`, `@stability`, and `@since`. Reference is generated by docgen (packages/inflectionts/docgen.json) and is not the only documentation. Partly fixed: `num`, `defverb`, `defa`, `defan`, `a`, `inflect`, and `singularNoun` now describe their parameters, failures, and pitfalls (bus -> bu; template names are snake_case). Missing: no `@param`/`@returns` tags elsewhere, and most operations list errors only in their type. The `apply*` functions, `makeInflector`, Schema.ts, and Errors.ts have no examples, and Schema.ts has no categories. The generated reference is gitignored and not published.

### 2.7 Explanation

- URL: https://diataxis.fr/explanation/
- Rules:
  - "Provide context ... explain why things are so - design decisions, historical reasons, technical constraints". Write a page on why there is per-layer `Ref<InflectorState>` isolation, why it is an Effect port of `jaraco/inflect`, and how it differs from upstream.
  - Name explanation pages so "you should be able to place an implicit (or even explicit) about in front of each title" (for example _About classical plurals_).
  - "Keep explanation closely bounded". Don't let instruction or reference creep in. "Explanation can and must consider alternatives".

**Change in repo (Applied):** docs/explanation.md (d784cdd) has headings that start with "About" ("About the Effect service", "About errors", "About modern and classical plurals", "About the relationship to Python's inflect"). It explains the per-layer state isolation with a running example and considers the alternative of a module-level singleton. It contains no task steps.

### 2.8 The compass

- URL: https://diataxis.fr/compass/
- Rules:
  - "To use the compass, just two questions need to be asked: action or cognition? acquisition or application?" Apply them "at the level of sentences and words" as well as at the level of whole documents when deciding where a README paragraph belongs.

**Change in repo (Applied):** Applied when d784cdd split README.md into README, tutorial, how-to, and explanation. The README keeps only orientation: what it is, an example, install, when to use it, and doc links. Task material moved to docs/how-to.md and design reasons to docs/explanation.md. No sentence-by-sentence audit is recorded.

### 2.9 Diátaxis as a guide to work (Workflow)

- URL: https://diataxis.fr/how-to-use-diataxis/
- Rules:
  - "It certainly does not mean that you should create empty structures for tutorials/howto guides/reference/explanation with nothing in them. Don't do that." Don't scaffold empty `docs/tutorials/` and similar folders.
  - "every step in the right direction is worth publishing immediately". Use small commits. Assess one piece: "What user need is represented by this? How well does it serve that need?"
  - Structure emerges: "Diátaxis changes the structure of your documentation from the inside". Docs should be "Complete, not finished".

**Change in repo (Applied):** docs/ has three filled files and no empty scaffolding (there is no docs/reference/; reference stays in JSDoc). Changes landed as small separate commits (d784cdd, 7a7b7e9, c407da1, 0073744, a3831b1).

### 2.10 Understanding Diátaxis

- URL: https://diataxis.fr/theory/
- Nothing applicable: it is a section index for the theory pages (2.11–2.15) with no rules of its own.

**Change in repo (Not applicable):** Not applicable: section index with no rules.

### 2.11 Foundations

- URL: https://diataxis.fr/foundations/
- Rules:
  - Theory page. Its one actionable point: "documentation must serve the needs of its users", and the four types are "a complete enumeration", so every piece of content should map to one need (learning, goals, information, understanding). Don't invent a fifth bucket (for example "Misc" or "Notes").

**Change in repo (Applied):** Every user doc maps to one of the four needs (tutorial.md, how-to.md, explanation.md, JSDoc reference), and there is no "Misc" or "Notes" bucket. Contributor and agent files (CONTRIBUTING.md, AGENTS.md, evals/) are separate audiences; see 2.19.

### 2.12 The map

- URL: https://diataxis.fr/map/
- Rules:
  - Don't structure docs "around features of a product". Doing so "is rarely successful".
  - Each type answers one question: tutorial "Can you teach me to…?", how-to "How do I…?", reference "What is…?", explanation "Why…?". Use these as section intros.
  - Watch for blur. The worst case is "a complete or partial collapse of tutorials and how-to guides into each other". A README _Usage_ section that mixes all four is the classic case.

**Change in repo (Applied):** Partly. Docs are organized by user need, not by product feature (d784cdd). The old README that mixed everything was replaced. Not done: sections do not open with the type's question ("Can you teach me to…?", "How do I…?", and so on).

### 2.13 Towards a theory of quality in documentation

- URL: https://diataxis.fr/quality/
- Rules:
  - Functional quality ("accuracy, completeness, consistency, usefulness, precision") must be checked against the code every release: "the next release or update means that we'll have to check our work once again". Automate this.
  - Mirroring code structure in reference "makes gaps in the documentation much more clearly visible". Use this to audit undocumented exports.

**Change in repo (Applied):** Partly. Functional quality is checked on every commit by docgen `runExamples` and check-docs.ts (see 1.23). Reference mirrors the modules, which makes gaps visible. Some gaps are still open: Schema.ts and Errors.ts exports and the seven `apply*` functions have no examples.

### 2.14 The difference between a tutorial and how-to guide

- URL: https://diataxis.fr/tutorials-how-to/
- Rules:
  - "the single most common conflation made in software product documentation is that between the tutorial and the how-to guide". Keep the getting-started lesson separate from the task recipes.
  - A tutorial "doesn't offer choices or alternatives", while a how-to guide "will typically fork and branch" ("If this, then that").
  - The difference is not basic vs advanced: "a tutorial can present something complex or advanced. And, a how-to guide can cover something that's basic".

**Change in repo (Applied):** docs/tutorial.md is one linear path with no choices. docs/how-to.md branches ("To get only the word without the count, use ...", "If you say it letter by letter, register it ..."). They are separate files (d784cdd).

### 2.15 The difference between reference and explanation

- URL: https://diataxis.fr/reference-explanation/
- Rules:
  - "Lists of things (such as classes or methods or attributes), and tables of information, will generally turn out to belong in reference."
  - Watch for "explanatory material sprinkled into reference". It is "bad for the reference" and "bad for the explanation too". Move the long "why" passages out of TSDoc into an explanation page.
  - The test: "is this something someone would turn to while working ... Or is it something they'd need once they have stepped away from the work".

**Change in repo (Applied):** Lists and tables are in reference: the operation table in skills/inflectionts/SKILL.md and the error classes in Errors.ts. The "why" passages (state isolation, typed errors, modern vs classical, articles) are in docs/explanation.md; JSDoc descriptions are one line plus short comments in examples.

### 2.16 Colophon

- URL: https://diataxis.fr/colophon/
- Nothing applicable: it covers authorship, contact, and citation. One aside: the Diátaxis repository ships a `CITATION.cff`, which is optional for a library.

**Change in repo (Not applicable):** Not applicable: colophon. No CITATION.cff; it is optional for this library.

### 2.17 Help translate Diátaxis

- URL: https://diataxis.fr/translation/
- Nothing applicable: it is about the Transifex process for translating the Diátaxis site. One weak point transfers to a terminology list: "find a native alternative, and use it consistently".

**Change in repo (Not applicable):** Not applicable: translation process for the Diátaxis site; the docs are English only. The terminology point is mapped (Not done) under 1.7.

### 2.18 News & Updates

- URL: https://diataxis.fr/news/
- Nothing applicable: it is a changelog (Atom feed, Polish translation, August 2026).

**Change in repo (Not applicable):** Not applicable: site changelog.

### 2.19 Diátaxis in complex hierarchies (removed from the live site in August 2026)

- URL: https://diataxis.fr/complex-hierarchies/ (now 404). Read from https://web.archive.org/web/20260802004758/https://diataxis.fr/complex-hierarchies/ and the source at https://github.com/evildmp/diataxis-documentation-framework/blob/0c9022ecbd82f8cd42069886faae40cd91eb8995/complex-hierarchies.rst
- Rules:
  - Landing pages: "The content of a landing page itself should read like an overview". It "should not simply present lists of other content, it should introduce them." Give the README's docs index a sentence per section.
  - "Seven items seems to be a comfortable general limit" for lists without an inherent order. Break up longer tables of contents.
  - Multiple audiences (users, "developers who build other products around it", contributors) are allowed to have their own structure, for example "completely separating the contributors' how-to guides" from user docs. This fits a library-user vs CLI-user vs contributor (AGENTS.md) split.
  - "Diátaxis is not a scheme into which documentation must be placed - four boxes". "Documentation should be as complex as it needs to be."

**Change in repo (Applied):** Partly. The README "Documentation" section is an overview with one sentence per entry, and it has 5 entries (under 7). Audiences are separated: README and docs/ for users, the `apps/cli` pointer and `--help` for CLI users, CONTRIBUTING.md and AGENTS.md for contributors and agents. The structure stays at three doc pages. Not followed: the docs/how-to.md TOC lists 10 unordered guides, above the suggested seven.

## Part 3: Agentic Engine Optimization (Addy Osmani, 11 April 2026)

### 3.1 Agentic Engine Optimization (AEO)

- URL: https://addyosmani.com/blog/agentic-engine-optimization/
- Rules:
  - Five criteria: "Discoverability - can agents find your documentation without rendering JavaScript?", "Parsability", "Token efficiency", "Capability signaling - does the documentation tell agents what your API does, not just how to call it?", and "Access control".
  - llms.txt: "a flat, Markdown-formatted file hosted at yourdomain.com/llms.txt". It needs "Descriptions that tell the agent what it will find, not just what the page is called". It should be "Organized by task, not by product hierarchy" and "Kept under 5,000 tokens itself".
  - Capability file: "llms.txt tells agents where things are. skill.md tells them what your product can actually do." It has frontmatter `name`/`description` and the sections "What I can accomplish", "Required inputs", "Constraints", and "Key documentation". "Each skill includes: capabilities, required inputs, constraints, key doc links".
  - Formatting: "Serve Markdown, not just HTML". "Use consistent heading hierarchies (H1 → H2 → H3, no skipping)". "Lead each section with the outcome, not the background". "Put code examples immediately after the claim they illustrate". "Use tables for parameter references". "The first 500 tokens of any page should answer: what is this, what can it do, and what do I need to get started."
  - Token budgets: "Quick start / getting started pages: < 15,000 tokens", "Individual API reference pages: < 25,000 tokens", "Conceptual guides: < 20,000 tokens", "No single page exceeds 30,000 tokens without chunking strategy". Estimate tokens by "count characters ... divide by ~4".
  - AGENTS.md: "Just as README.md became the default entry point for human developers exploring a repository, AGENTS.md is becoming the entry point for AI agents." It should include "Project structure and key file locations", "Direct links to relevant API or service documentation", "Rate limits and constraints the agent should know about", and "Preferred patterns and conventions for the codebase". The audit checklist adds "AGENTS.md exists in code repositories linking to relevant docs".
  - Not applicable to a library without a docs website: robots.txt, agent-permissions.json, the "Copy for AI" button, AI referral analytics, and HTTP fingerprint monitoring.

**Change in repo (Applied):** Partly. Rule 2: llms.txt (7a7b7e9) is plain Markdown, organized by task (Start here, Tasks, Reference, Background), describes what each link contains, and gives token counts for most entries. It is about 560 tokens by the chars/4 estimate. It sits at the repo root, not at a hosted domain, and the Reference and PARITY.md entries have no token counts. Rule 3: skills/inflectionts/SKILL.md (7a7b7e9, c407da1) has `name`/`description` frontmatter and sections "When to use it", "Install", "Use it", "Operations" (a table), "Constraints", and "Documentation" (links). There is no separate "Required inputs" section. Its example runs in check-docs.ts. Rule 4: Markdown throughout. The README's first ~500 tokens give what it is, an example, and install. The SKILL.md operation table is the only parameter table. Rule 5 (chars/4): README ~1.1k, docs/how-to.md ~2.4k, docs/tutorial.md ~0.7k, docs/explanation.md ~1.0k, Inflector.ts ~12.4k tokens, all within budget. Rule 6: AGENTS.md was cut from 7,020 to 1,011 tokens (7a7b7e9, per the commit message). It has commands, a file map ("Where things are"), "Rules the checks don't catch", and Effect v4 conventions, and it names the human docs. It refers to them by path rather than by link. Rule 7 does not apply: there is no docs website.
