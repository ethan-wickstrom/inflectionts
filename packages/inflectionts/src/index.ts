import { Schema } from "effect"

export const Word = Schema.NonEmptyString.pipe(Schema.brand("Word"))
export type Word = (typeof Word)["Type"]
