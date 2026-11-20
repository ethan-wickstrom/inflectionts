import { Schema } from "effect"

export class InvalidWordError extends Schema.TaggedError<InvalidWordError, { readonly brand: unique symbol }>()(
  "InvalidWordError",
  {
    input: Schema.String,
    message: Schema.String
  }
) {}

export class UnknownClassicalModeError extends Schema.TaggedError<
  UnknownClassicalModeError,
  { readonly brand: unique symbol }
>()("UnknownClassicalModeError", {
  mode: Schema.String,
  message: Schema.String
}) {}

export class BadNumValueError extends Schema.TaggedError<BadNumValueError, { readonly brand: unique symbol }>()(
  "BadNumValueError",
  {
    input: Schema.String,
    message: Schema.String
  }
) {}

export class BadChunkingOptionError extends Schema.TaggedError<
  BadChunkingOptionError,
  { readonly brand: unique symbol }
>()("BadChunkingOptionError", {
  group: Schema.Union([Schema.Finite, Schema.String]),
  message: Schema.String
}) {}

export class NumOutOfRangeError extends Schema.TaggedError<NumOutOfRangeError, { readonly brand: unique symbol }>()(
  "NumOutOfRangeError",
  {
    input: Schema.String,
    message: Schema.String
  }
) {}

export class BadUserDefinedPatternError extends Schema.TaggedError<
  BadUserDefinedPatternError,
  { readonly brand: unique symbol }
>()("BadUserDefinedPatternError", {
  pattern: Schema.String,
  message: Schema.String
}) {}

export class BadGenderError extends Schema.TaggedError<BadGenderError, { readonly brand: unique symbol }>()(
  "BadGenderError",
  {
    gender: Schema.String,
    message: Schema.String
  }
) {}

export class InflectTemplateError extends Schema.TaggedError<InflectTemplateError, { readonly brand: unique symbol }>()(
  "InflectTemplateError",
  {
    expression: Schema.String,
    message: Schema.String
  }
) {}

export type InflectError =
  | InvalidWordError
  | UnknownClassicalModeError
  | BadNumValueError
  | BadChunkingOptionError
  | NumOutOfRangeError
  | BadUserDefinedPatternError
  | BadGenderError
  | InflectTemplateError
