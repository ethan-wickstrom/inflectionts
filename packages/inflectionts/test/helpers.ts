import { Arbitrary, Effect, Exit, Layer } from "effect"
import { Inflector, type InflectorState } from "inflectionts"

/**
 * Run a scoped Effect inside Bun's test runner, surfacing any failure or defect.
 */
export function runScoped<A, E>(effect: Effect.Effect<A, E>): Promise<A> {
  return Effect.runPromise(Effect.scoped(effect))
}

/**
 * Run an Effect program with a fresh isolated `Inflector` layer.
 */
export function runInflector<A, E>(effect: Effect.Effect<A, E, Inflector>, initialState?: InflectorState): Promise<A> {
  const layer = initialState === undefined ? Inflector.layer : Inflector.layerWith(initialState)
  return runScoped(Effect.provide(effect, layer))
}

/**
 * Run an Effect program with a fresh isolated `Inflector` layer and return its `Exit`
 * so tests can assert typed domain errors without throwing.
 */
export function runInflectorExit<A, E>(
  effect: Effect.Effect<A, E, Inflector>,
  initialState?: InflectorState
): Promise<Exit.Exit<A, E>> {
  const layer = initialState === undefined ? Inflector.layer : Inflector.layerWith(initialState)
  return runScoped(Effect.exit(Effect.provide(effect, layer)))
}

/**
 * Execute an Effect Arbitrary property test, providing a fresh isolated `Inflector`
 * layer to every evaluation (including shrinking and replay), and accept ONLY `Passed`.
 */
export function checkInflectorProperty<A, E>(
  arbitrary: Arbitrary.Arbitrary<A>,
  property: (value: A) => Effect.Effect<boolean, E, Inflector>,
  options?: Arbitrary.CheckOptions
): Promise<void> {
  const program = Effect.gen(function* () {
    const result = yield* Arbitrary.checkEffect(
      arbitrary,
      (value) => Effect.scoped(Effect.provide(property(value), Layer.fresh(Inflector.layer))),
      options
    )
    if (result._tag !== "Passed") {
      const detail = Arbitrary.formatCheckFailure(result) ?? `Property check failed with status: ${result._tag}`
      return yield* Effect.die(new Error(detail))
    }
  })
  return runScoped(program)
}
