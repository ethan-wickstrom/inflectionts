#!/usr/bin/env bun
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunServices from "@effect/platform-bun/BunServices"
import { Command } from "effect/cli"
import * as Effect from "effect/Effect"

import { cli } from "./Cli.ts"

cli.pipe(Command.run({ version: "0.1.0" }), Effect.provide(BunServices.layer), BunRuntime.runMain)
