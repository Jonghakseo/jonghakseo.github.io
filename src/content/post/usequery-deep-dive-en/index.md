---
title: "Tracing the Flow of useQuery"
description: "Following the source code of Apollo Client's useQuery hook to analyze the data fetching flow."
publishDate: "2024-10-13"
tags: ["apolloclient", "graphql", "react"]
lang: "en"
translationQuality: "draft"
---

The most commonly used hook when working with Apollo Client is probably useQuery.

How does ApolloClient fetch data according to your declared GraphQL specification? Let's trace through the source code to find out.

## useQuery.ts

https://github.com/apollographql/apollo-client/blob/v3.11.8/src/react/hooks/useQuery.ts

https://github.com/apollographql/apollo-client/blob/v3.11.8/src/react/hooks/useQuery.ts#L155

```ts
function _useQuery<
  TData = any,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options: QueryHookOptions<NoInfer<TData>, NoInfer<TVariables>>
) {
  const { result, obsQueryFields } = useQueryInternals(query, options);
  return React.useMemo(
    () => ({ ...result, ...obsQueryFields }),
    [result, obsQueryFields]
  );
}
```

We can see that the useQuery hook is a wrapper around the `_useQuery` implementation, which in turn is a memoization of the return value from `useQueryInternals`.

### useQueryInternals

```ts
export function useQueryInternals<
  TData = any,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options: QueryHookOptions<NoInfer<TData>, NoInfer<TVariables>>
) {
  const client = useApolloClient(options.client);

  const renderPromises = React.useContext(getApolloContext()).renderPromises;
  const isSyncSSR = !!renderPromises;
  const disableNetworkFetches = client.disableNetworkFetches;
  const ssrAllowed = options.ssr !== false && !options.skip;
  const partialRefetch = options.partialRefetch;

  const makeWatchQueryOptions = createMakeWatchQueryOptions(
    client,
    query,
    options,
    isSyncSSR
  );

  const [{ observable, resultData }, onQueryExecuted] = useInternalState(
    client,
    query,
    options,
    renderPromises,
    makeWatchQueryOptions
  );

  const watchQueryOptions: Readonly<WatchQueryOptions<TVariables, TData>> =
    makeWatchQueryOptions(observable);

  useResubscribeIfNecessary<TData, TVariables>(
    resultData,
    observable,
    client,
    options,
    watchQueryOptions
  );

  const obsQueryFields = React.useMemo<
    Omit<ObservableQueryFields<TData, TVariables>, "variables">
  >(() => bindObservableMethods(observable), [observable]);

  useRegisterSSRObservable(observable, renderPromises, ssrAllowed);

  const result = useObservableSubscriptionResult<TData, TVariables>(
    resultData,
    observable,
    client,
    options,
    watchQueryOptions,
    disableNetworkFetches,
    partialRefetch,
    isSyncSSR,
    {
      onCompleted: options.onCompleted || noop,
      onError: options.onError || noop,
    }
  );

  return {
    result,
    obsQueryFields,
    observable,
    resultData,
    client,
    onQueryExecuted,
  };
}
```

With all the configurations and options intertwined, it's not immediately clear where the actual request is made. Let's start by examining the `useObservableSubscriptionResult` hook. Notice that callbacks like `onError` and `onCompleted` are passed into this hook.

```ts
function useObservableSubscriptionResult<
  TData = any,
  TVariables extends OperationVariables = OperationVariables,
>(
  resultData: InternalResult<TData, TVariables>,
  observable: ObservableQuery<TData, TVariables>,
  client: ApolloClient<object>,
  options: QueryHookOptions<NoInfer<TData>, NoInfer<TVariables>>,
  watchQueryOptions: Readonly<WatchQueryOptions<TVariables, TData>>,
  disableNetworkFetches: boolean,
  partialRefetch: boolean | undefined,
  isSyncSSR: boolean,
  callbacks: {
    onCompleted: (data: TData) => void;
    onError: (error: ApolloError) => void;
  }
) {
  const callbackRef = React.useRef<Callbacks<TData>>(callbacks);
  React.useEffect(() => {
    callbackRef.current = callbacks;
  });

  const resultOverride =
    (
      (isSyncSSR || disableNetworkFetches) &&
      options.ssr === false &&
      !options.skip
    ) ?
      ssrDisabledResult
    : options.skip || watchQueryOptions.fetchPolicy === "standby" ?
      skipStandbyResult
    : void 0;

  const previousData = resultData.previousData;
  const currentResultOverride = React.useMemo(
    () =>
      resultOverride &&
      toQueryResult(resultOverride, previousData, observable, client),
    [client, observable, resultOverride, previousData]
  );

  return useSyncExternalStore(
    React.useCallback(
      (handleStoreChange) => {
        disableNetworkFetches;

        if (isSyncSSR) {
          return () => {};
        }

        const onNext = () => {
          const previousResult = resultData.current;
          const result = observable.getCurrentResult();
          if (
            previousResult &&
            previousResult.loading === result.loading &&
            previousResult.networkStatus === result.networkStatus &&
            equal(previousResult.data, result.data)
          ) {
            return;
          }

          setResult(
            result,
            resultData,
            observable,
            client,
            partialRefetch,
            handleStoreChange,
            callbackRef.current
          );
        };

        const onError = (error: Error) => {
          subscription.current.unsubscribe();
          subscription.current = observable.resubscribeAfterError(
            onNext,
            onError
          );

          if (!hasOwnProperty.call(error, "graphQLErrors")) {
            throw error;
          }

          const previousResult = resultData.current;
          if (
            !previousResult ||
            (previousResult && previousResult.loading) ||
            !equal(error, previousResult.error)
          ) {
            setResult(
              {
                data: (previousResult && previousResult.data) as TData,
                error: error as ApolloError,
                loading: false,
                networkStatus: NetworkStatus.error,
              },
              resultData,
              observable,
              client,
              partialRefetch,
              handleStoreChange,
              callbackRef.current
            );
          }
        };

        const subscription = { current: observable.subscribe(onNext, onError) };

        return () => {
          setTimeout(() => subscription.current.unsubscribe());
        };
      },

      [
        disableNetworkFetches,
        isSyncSSR,
        observable,
        resultData,
        partialRefetch,
        client,
      ]
    ),
    () =>
      currentResultOverride ||
      getCurrentResult(
        resultData,
        observable,
        callbackRef.current,
        partialRefetch,
        client
      ),
    () =>
      currentResultOverride ||
      getCurrentResult(
        resultData,
        observable,
        callbackRef.current,
        partialRefetch,
        client
      )
  );
}
```

That's quite a long block of code, but don't be intimidated—let's break it down piece by piece.

```ts
  const callbackRef = React.useRef<Callbacks<TData>>(callbacks);
  React.useEffect(() => {
    callbackRef.current = callbacks;
  });
```

Overall, the comments are quite helpful and the patterns aren't unfamiliar, making it fairly easy to follow.

The `onCompleted` and `onError` callbacks are stored in `callbackRef` via useRef, and a useEffect without dependencies is used to keep `callbackRef` up to date on every render.

If the injected `onError` and `onCompleted` callbacks aren't kept current, stale state references inside those callbacks could lead to unexpected side effects. Looking at this code, the useEvent RFC comes to mind.

I'll skip over the `resultOverride` ~ `currentResultOverride` code. In brief, it overrides the default return data type based on conditions like SSR status and skip flag.

Let's jump to the climax: the `useSyncExternalStore` + `useCallback` return code.

```ts
  return useSyncExternalStore(
    React.useCallback(
      (handleStoreChange) => {
        disableNetworkFetches;

        if (isSyncSSR) {
          return () => {};
        }
        // ...
```

There's an interesting line where `disableNetworkFetches` just sits there. It's not a call, not an assignment—it's literally just a reference. According to the comments, this bare reference forces the hook to maintain a dependency on `disableNetworkFetches`.

The intent seems to be that if the hook's context ever loses access to `disableNetworkFetches`, it would trigger a reference error. A fun and hacky implementation! If the useCallback-wrapped function were somehow unbound from the current context, it could potentially error. But I found it hard to determine the exact use case where this would occur, even after reading the review comments... 🤔

Review comment for this change: https://github.com/apollographql/apollo-client/pull/11869#discussion_r1664889946

Let's look at the `onNext` callback declaration below.

```ts
        const onNext = () => {
          const previousResult = resultData.current;
          const result = observable.getCurrentResult();
          if (
            previousResult &&
            previousResult.loading === result.loading &&
            previousResult.networkStatus === result.networkStatus &&
            equal(previousResult.data, result.data)
          ) {
            return;
          }

          setResult(
            result,
            resultData,
            observable,
            client,
            partialRefetch,
            handleStoreChange,
            callbackRef.current
          );
        };
```

To properly understand the name `onNext` in context, you need familiarity with the Observer pattern and Observable objects. In simple terms, the Observer pattern is a design pattern where a provider (Observable) sends notifications to its observers. Observers implement callback methods like `onNext`, `onError`, and `onComplete` to declare how they handle provided events. So in this context, `onNext` is called when something like a query response is received.

If there's already a previously fetched result, and the previous result's loading state matches the current one, with the same network status and equal data, it simply returns without doing anything. This is treated as a situation where no additional rendering is needed.

In all other cases, `setResult` is called to store the current result. The `setResult` implementation looks like this:

```ts
function setResult<TData, TVariables extends OperationVariables>(
  nextResult: ApolloQueryResult<TData>,
  resultData: InternalResult<TData, TVariables>,
  observable: ObservableQuery<TData, TVariables>,
  client: ApolloClient<object>,
  partialRefetch: boolean | undefined,
  forceUpdate: () => void,
  callbacks: Callbacks<TData>
) {
  const previousResult = resultData.current;
  if (previousResult && previousResult.data) {
    resultData.previousData = previousResult.data;
  }

  if (!nextResult.error && isNonEmptyArray(nextResult.errors)) {
    nextResult.error = new ApolloError({ graphQLErrors: nextResult.errors });
  }

  resultData.current = toQueryResult(
    unsafeHandlePartialRefetch(nextResult, observable, partialRefetch),
    resultData.previousData,
    observable,
    client
  );
  forceUpdate();
  handleErrorOrCompleted(nextResult, previousResult?.networkStatus, callbacks);
}
```

The current response data is saved as `previousData` in the internal store. If there's an error in the current response, an `ApolloError` object is created and placed in the error field. This error is then passed to `handleErrorOrCompleted` for processing.

`forceUpdate()` is the `handleStoreChange` method passed when calling `setResult`. This method corresponds to the argument of the useCallback function passed as the first argument to `useSyncExternalStore`. It might look confusing in code, but it becomes clear when you look at the `useSyncExternalStore` signature:

```ts
    export function useSyncExternalStore<Snapshot>(
        subscribe: (onStoreChange: () => void) => () => void,
        getSnapshot: () => Snapshot,
        getServerSnapshot?: () => Snapshot,
    ): Snapshot;
```

That `onStoreChange` parameter is what's passed as `handleStoreChange` and then as `forceUpdate`.

When `useSyncExternalStore` calls `onStoreChange` (passed through the subscribe function), it compares Snapshots to determine whether to re-render—so it plays the role of triggering renders. Strictly speaking, since React decides whether to render based on equality comparison of the returned Snapshot, it's not really a "force" update.

Let's take a brief detour to look at `handleErrorOrCompleted`.

```ts
function handleErrorOrCompleted<TData>(
  result: ApolloQueryResult<TData>,
  previousNetworkStatus: NetworkStatus | undefined,
  callbacks: Callbacks<TData>
) {
  if (!result.loading) {
    const error = toApolloError(result);

    // wait a tick in case we are in the middle of rendering a component
    Promise.resolve()
      .then(() => {
        if (error) {
          callbacks.onError(error);
        } else if (
          result.data &&
          previousNetworkStatus !== result.networkStatus &&
          result.networkStatus === NetworkStatus.ready
        ) {
          callbacks.onCompleted(result.data);
        }
      })
      .catch((error) => {
        invariant.warn(error);
      });
  }
}
```

It's interesting that when `handleErrorOrCompleted` is called during component rendering, it uses `Promise.resolve()` to defer one tick before invoking callbacks, waiting for the render to complete.

https://github.com/apollographql/apollo-client/pull/9801 — Delay execution of callback functions to fix React errors by dylanwulf

Let's return to the `useObservableSubscriptionResult` hook and continue.

```ts
        const onError = (error: Error) => {
          subscription.current.unsubscribe();
          subscription.current = observable.resubscribeAfterError(
            onNext,
            onError
          );

          if (!hasOwnProperty.call(error, "graphQLErrors")) {
            throw error;
          }

          const previousResult = resultData.current;
          if (
            !previousResult ||
            (previousResult && previousResult.loading) ||
            !equal(error, previousResult.error)
          ) {
            setResult(
              {
                data: (previousResult && previousResult.data) as TData,
                error: error as ApolloError,
                loading: false,
                networkStatus: NetworkStatus.error,
              },
              resultData,
              observable,
              client,
              partialRefetch,
              handleStoreChange,
              callbackRef.current
            );
          }
        };
```

Here we see the `onError` callback. When an error occurs, it unsubscribes and resubscribes via `resubscribeAfterError`. Looking at the internal implementation, it simply clears the last data and creates a new subscription.

Since it throws for non-GraphQL errors, the `onError` callback apparently only executes for GraphQL errors specifically. There's another check for whether re-rendering is needed (notably using OR operators here instead of AND operators like in `onNext`—whether this is purely for readability is unclear), and similarly triggers rendering through `setResult`.

Looking at the code just below:

```ts
        const subscription = { current: observable.subscribe(onNext, onError) };

        return () => {
          setTimeout(() => subscription.current.unsubscribe());
        };
```

There's a comment about wrapping the subscription in a `current` object due to compiler evaluation issues, and the cleanup function (returned from the subscribe function) wraps unsubscribe in `setTimeout`.

The deliberate short delay prevents issues when subscribe/unsubscribe events happen in rapid succession (like "unsubscribe → resubscribe → unsubscribe"). By deferring unsubscription, it allows **reusing a subscription that's about to be removed but hasn't been removed yet**.

The `getSnapshot` portion is straightforward:

```ts
    () =>
      currentResultOverride ||
      getCurrentResult(
        resultData,
        observable,
        callbackRef.current,
        partialRefetch,
        client
      ),
```

Unless there's an overridden response for specific conditions, it uses `getCurrentResult` to fetch the current state. `getCurrentResult` is equivalent to `resultData.current`.

Here's a summary of the overall flow so far:

1. The useQuery hook is a wrapper around `_useQuery`, which memoizes the return value of `useQueryInternals`.
2. Digging into suspicious parts of `useQueryInternals`, we found `useObservableSubscriptionResult`, which returns query results.
3. `useObservableSubscriptionResult` uses `useSyncExternalStore` with an Observer implementation that has `onNext` and `onError` callbacks to subscribe to query results.
4. To find where the actual request is made, we need to look at where the observable is *created*, not where it's *subscribed to*.

In hindsight, the hook name `useObservableSubscriptionResult` clearly states that it manages subscriptions and handles callbacks and state updates through results! So the actual request must originate from wherever the observable object (passed as an argument) is created. With this in mind, let's re-examine `useQueryInternals` for suspicious spots:

```ts
  const [{ observable, resultData }, onQueryExecuted] = useInternalState(
    client,
    query,
    options,
    renderPromises,
    makeWatchQueryOptions
  );
```

I initially glossed over `useInternalState`, assuming from its name that it only managed internal state. But on closer inspection, its return value includes `observable`. Digging into the implementation, we find where the observable is declared:

```ts
     observable:
        (renderPromises &&
          renderPromises.getSSRObservable(makeWatchQueryOptions())) ||
        client.watchQuery(
          getObsQueryOptions(void 0, client, options, makeWatchQueryOptions())
        ),
```

In SSR environments, it checks if there's an already-stored SSR Observable in `renderPromises` and returns it. On the client side, calling `client.watchQuery` returns the Observable.

`ApolloClient.watchQuery` is a wrapper around `QueryManager`'s `watchQuery`:

```ts
  public watchQuery<
    T,
    TVariables extends OperationVariables = OperationVariables,
  >(options: WatchQueryOptions<TVariables, T>): ObservableQuery<T, TVariables> {
    const query = this.transform(options.query);

    options = {
      ...options,
      variables: this.getVariables(query, options.variables) as TVariables,
    };

    if (typeof options.notifyOnNetworkStatusChange === "undefined") {
      options.notifyOnNetworkStatusChange = false;
    }

    const queryInfo = new QueryInfo(this);
    const observable = new ObservableQuery<T, TVariables>({
      queryManager: this,
      queryInfo,
      options,
    });
    observable["lastQuery"] = query;

    this.queries.set(observable.queryId, queryInfo);

    queryInfo.init({
      document: query,
      observableQuery: observable,
      variables: observable.variables,
    });

    return observable;
  }
```

We've finally found the code that actually creates the observable!

Taking a quick look at the `ObservableQuery` constructor:

```ts
  constructor({
    queryManager,
    queryInfo,
    options,
  }: {
    queryManager: QueryManager<any>;
    queryInfo: QueryInfo;
    options: WatchQueryOptions<TVariables, TData>;
  }) {
    super((observer: Observer<ApolloQueryResult<TData>>) => {
      // ...
      const first = !this.observers.size;
      this.observers.add(observer);

      const last = this.last;
      if (last && last.error) {
        observer.error && observer.error(last.error);
      } else if (last && last.result) {
        observer.next && observer.next(last.result);
      }

      if (first) {
        this.reobserve().catch(() => {});
      }

      return () => {
        if (this.observers.delete(observer) && !this.observers.size) {
          this.tearDownQuery();
        }
      };
    });
```

`ObservableQuery` inherits from a zen-observable implementation. If there are no observers yet subscribed to the observable, it means we're just beginning to subscribe to this query. In this case, `this.reobserve` is called.

The `reobserve` method is a wrapper around `reobserveAsConcast`.

The term "Concast" was new to me, but there's a helpful comment at the Concast class declaration:

> A Concast\<T\> observable concatenates the given sources into a single non-overlapping sequence of T values, automatically unwrapping all promises, and broadcasts the T elements of that sequence to any number of subscribers, without creating numerous intermediate Observable wrapper objects.
>
> A Concast can have multiple observers, but each source observable is guaranteed at most one subscribe call, and the results are multicast to all observers.

Inside `reobserveAsConcast`, the actual fetch occurs via `const { concast, fromLink } = this.fetch(options, newNetworkStatus, query);`.

The `fetch` method calls `QueryManager`'s `fetchConcastWithInfo`, which in turn calls `fetchQueryByPolicy`.

In `fetchQueryByPolicy`, we can see actual requests being made based on different fetch policies (note the detail of using `default:` at the top of the switch for cache-first as the default):

```ts
    switch (fetchPolicy) {
      default:
      case "cache-first": {
        const diff = readCache();

        if (diff.complete) {
          return {
            fromLink: false,
            sources: [resultsFromCache(diff, queryInfo.markReady())],
          };
        }

        if (returnPartialData || shouldNotify) {
          return {
            fromLink: true,
            sources: [resultsFromCache(diff), resultsFromLink()],
          };
        }

        return { fromLink: true, sources: [resultsFromLink()] };
      }
      // ...
```

`resultsFromCache` retrieves query results from the cache, while `resultsFromLink` fetches data through an actual request. `resultsFromLink` leads to `QueryManager`'s `getResultsFromLink`:

```ts
   return asyncMap(
      this.getObservableFromLink(
        linkDocument,
        options.context,
        options.variables
      ),
      // ...
```

Through `getObservableFromLink`, we arrive at `ApolloLink.execute`:

```ts
  public static execute(
    link: ApolloLink,
    operation: GraphQLRequest
  ): Observable<FetchResult> {
    return (
      link.request(
        createOperation(
          operation.context,
          transformOperation(validateOperation(operation))
        )
      ) || Observable.of()
    );
  }
```

We've finally arrived! There's a process that transforms the query operation into a payload format for `ApolloLink`'s `request`, and the actual request is made here.

Apollo Client is designed to allow free injection of HTTP request implementations, which can be freely defined in the `httpLink` configuration during Apollo Client initialization:

```ts
import fetch from 'cross-fetch';

const httpLink = new HttpLink({ uri: ENV.APOLLO_API_END_POINT, fetch });
const authLink = setContext((_, { headers }) => { /* ... */ });
const link = ApolloLink.from([authLink, httpLink]);

export const initializeApollo = () => {
  return new ApolloClient({
    link,
    cache,
    // ...
  });
};
```

`HttpLink` is created via `createHttpLink`. If you don't explicitly inject `fetch` when creating the httpLink, each environment's `backupFetch` is used:

```ts
const backupFetch = maybe(() => fetch);

export const createHttpLink = (linkOptions: HttpOptions = {}) => {
  // ...
  return new Observable((observer) => {
    const currentFetch = preferredFetch || maybe(() => fetch) || backupFetch;

    currentFetch!(chosenURI, options)
      .then((response) => {
        // ...
      });
  });
};
```

We've finally found where the actual fetch request is made. There's an interesting detail in how `currentFetch` is evaluated:

> If linkOptions.fetch (preferredFetch) is provided, use that. Otherwise, use the current global window.fetch function (see issue #7832). If even that's not available, use the backupFetch function that was saved when the module was first evaluated. This last option handles the unlikely but not impossible scenario where window.fetch gets removed.

Using the global `window.fetch` as a fallback wasn't surprising, but what's interesting is that they go a step further by keeping a `backupFetch` captured at module evaluation time, guarding against `window.fetch` being removed. Even if the global fetch is somehow removed from global scope by the time `createHttpLink` is called, it can still use the fetch method that was referenced at evaluation time.

## Thoughts

I personally find the Apollo Client codebase fairly readable. Even though I chose useQuery, which is one of the simpler parts, there was still a lot to read and I admittedly got a bit fatigued toward the end. Still, it was refreshing to see the overall flow and Observable pattern implementations, and I learned about new concepts like Concast.

## References

Why isn't useQuery's argument in object form?
https://github.com/apollographql/apollo-client/pull/11869#discussion_r1665511736
