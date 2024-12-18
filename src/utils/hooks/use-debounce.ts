import { type DependencyList, useEffect } from "react"
import useTimeoutFn from "./use-timeout-fn"

export type UseDebounceReturn = [() => boolean | null, () => void]

export default function useDebounce(
  fn: () => void,
  ms = 0,
  deps: DependencyList = [],
): UseDebounceReturn {
  const [isReady, cancel, reset] = useTimeoutFn(fn, ms)

  useEffect(reset, deps)

  return [isReady, cancel]
}
