---
title: "useQuery의 흐름 끄적끄적"
description: "Apollo Client의 useQuery 훅 소스코드를 따라가며 데이터 요청 흐름을 분석합니다."
publishDate: "2024-10-13"
tags: ["react"]
lang: "ko"
translationSlug: "usequery-deep-dive-en"
---

아폴로 클라이언트를 사용하면서 가장 많이 사용하는 훅은 useQuery일 것이다.

선언한 graphql 규격에 맞춰, ApolloClient는 어떻게 데이터를 요청할까? 소스코드 흐름을 보며 따라가보자.

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

useQuery 훅은 _useQuery 구현체의 wrapper이고, _useQuery 구현체는 useQueryInternals의 반환값에 대한 메모이제이션임을 알 수 있다.

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

여러 설정과 옵션이 얽혀 실제 요청이 어디서 되는지 명확하진 않지만, useObservableSubscriptionResult 훅을 먼저 살펴보자. onError, onCompleted 등의 콜백도 해당 훅으로 넘어가는 것을 볼 수 있다.

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

뭔가 긴 코드가 나왔지만... 두려워 말고 한 부분씩 살펴보자.

```ts
  const callbackRef = React.useRef<Callbacks<TData>>(callbacks);
  React.useEffect(() => {
    callbackRef.current = callbacks;
  });
```

전반적으로 주석도 친절하게 적혀있고, 패턴 자체도 생소하진 않아서 살펴보는게 어렵진 않다.

useRef로 onCompleted, onError 콜백을 callbackRef에 저장하고, 매 렌더링마다 callbackRef에 보관된 콜백들을 최신화하기 위해 deps가 없는 useEffect를 사용했다.

onError, onCompleted로 주입받은 콜백을 최신화 시켜주지 않으면 해당 콜백에서 이전 상태를 참조하고 있는 경우 예상치 못한 사이드 이펙트가 발생할 수 있다. 해당 코드를 보니 불현듯 useEvent RFC가 생각이 난다.

그 다음 resultOverride ~ currentResultOverride 코드는 생략. 살짝 보자면 ssr 여부, skip 여부 등에 따라 기본 반환 데이터의 타입을 덮어씌우는 코드로 보인다.

클라이막스인 반환부의 useSyncExternalStore + useCallback 코드로 넘어가자.

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

뜬금없이 disableNetworkFetches 를 적어두는 재미있는 코드가 보인다. 호출도 아니고, 사용도 아니고, 할당도 아닌 말 그대로 참조만 한다. 주석을 보니 disableNetworkFetches의 단순 참조로 해당 훅이 disableNetworkFetches에 대한 의존성을 가지는 것을 강제하는 코드라고 한다.

만약 훅의 컨텍스트가 disableNetworkFetches를 참조할 수 있는 범위를 벗어나게 되면 참조 에러를 발생시키려는 의도로 보인다! 재미있고 해키한 구현이다. 만약 useCallback으로 선언된 해당 함수가 현재 컨텍스트에 바인딩 되지 않았다면 에러가 날 수도? 근데 이게 어떤 상황에서 발생하는 것인지 유즈케이스까지는 리뷰 코멘트를 봐도 알기가 어려웠다…🤔

해당 변경사항에 대한 리뷰 코멘트: https://github.com/apollographql/apollo-client/pull/11869#discussion_r1664889946

아래로 내려가서 onNext 콜백 선언부를 보자.

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

onNext 메소드의 이름을 정확한 컨텍스트에서 이해하려면 옵저버 패턴과 Observable 객체에 대한 이해가 필요하다. 간단하게 말하면 옵저버 패턴은 공급자(Provider or Observable)가 관찰자들(Observers)에게 알림을 보내는 디자인 패턴이라고 할 수 있는데, 관찰자들은 onNext, onError, onComplete 등의 이벤트 수신 콜백 메소드를 구현해서 제공되는 이벤트에 대한 처리를 어떻게 할 지 선언한다. 즉, 이 맥락에서 onNext 메소드는 쿼리의 응답 따위를 수신한 상황이라고 할 수 있다.

이전에 이미 가져온 결과가 있고, 이전 결과와 현재 상태의 로딩이 같으면서, 네트워크 status도 동일하고, 그 결과까지 같다면 아무것도 하지 않고 return을 해준다. 렌더링이 추가적으로 필요하지 않은 상황이라고 간주하는 것으로 보인다.

그 외의 경우에는 setResult 를 호출해서 현재의 결과를 저장하는 것으로 보이는데, setResult 구현은 다음과 같다.

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

현재의 응답 데이터를 internalStore의 previousData로 저장한 후, 현재 응답에 에러가 있다면 ApolloError 객체를 생성하여 error 필드에 넣어준다. 이 에러는 handleErrorOrCompleted로 넘겨서 처리된다.

forceUpdate() 는 setResult 호출시 전달된 handleStoreChange 메소드이다. 해당 메소드는 useSyncExternalStore의 첫 번째 인자로 넘긴 useCallback 함수의 인자에 해당하는 함수인데, 코드로 보면 헷갈리지만 useSyncExternalStore의 시그니처를 보면 쉽게 이해가 가능하다.

```ts
    export function useSyncExternalStore<Snapshot>(
        subscribe: (onStoreChange: () => void) => () => void,
        getSnapshot: () => Snapshot,
        getServerSnapshot?: () => Snapshot,
    ): Snapshot;
```

바로 저 onStoreChange 부분이 handleStoreChange 라는 이름으로, 그리고 forceUpdate 라는 이름으로 전달된 부분이다.

useSyncExternalStore는 subscribe 함수를 통해 전달한 onStoreChange 를 호출할 때, Snapshot 간의 비교를 통해 렌더링 여부를 결정하게 되니 렌더링을 트리거하는 역할을 한다고 볼 수 있겠다. 그러니 엄밀히 말하면 반환된 Snapshot에 대한 동등성 비교 이후 렌더링 여부를 리액트에서 결정하는 셈이니 forceUpdate는 아니다.

잠깐 밖으로 새서 handleErrorOrCompleted도 살펴보자.

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

컴포넌트 렌더 중 handleErrorOrCompleted 메소드가 호출될 경우, 바로 콜백들을 호출하지 않고 렌더링을 기다리기 위해 한 틱을 보내는 Promise.resolve()를 사용해준 부분이 흥미롭다.

https://github.com/apollographql/apollo-client/pull/9801 — Delay execution of callback functions to fix React errors by dylanwulf

다시 useObservableSubscriptionResult 훅으로 돌아와 이어서 살펴보자.

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

onError에 대한 콜백이 보인다. 에러가 발생하면 subscription을 끊어주고, resubscribeAfterError 메소드를 통해 재구독을 해주는 모습이 보인다. resubscribeAfterError 내부 구현을 보니 마지막 데이터를 지우고 새로 구독을 하는 단순한 동작이다.

Graphql에러가 아닌 경우에는 throw error를 하는걸 보니 GraphqlError인 경우에 onError 콜백이 실행되는 것인지? 의심을 해본다. 다시 한 번 렌더링이 필요한지 확인하는 로직이 있고(여기서는 onNext와 달리 AND 연산자가 아니라 OR 연산자를 사용하는데 단순 가독성의 이유인지?) 마찬가지로 setResult를 통해 렌더링을 트리거한다.

바로 아랫 부분을 추가로 살펴보면

```ts
        const subscription = { current: observable.subscribe(onNext, onError) };

        return () => {
          setTimeout(() => subscription.current.unsubscribe());
        };
```

subscription에 대한 컴파일러의 평가 문제로 current 객체로 바꾼 부분의 확인이 필요하다…는 주석이 있고, subscribe 함수의 반환 함수인 구독 해제 함수를 setTimeout으로 감싸두었다.

무슨 말인지 살펴보니, 일부러 짧은 지연시간을 두어 '구독 취소 → 재구독 → 구독취소' 와 같이 짧은 간격으로 구독 취소와 재구독 이벤트가 발생하는 경우, 구독 취소를 지연시켜 **곧 제거될 subscription 이지만 아직 제거되지 않은 subscription을 재사용**하기 위함으로 보인다.

getSnapShot 부분에 해당하는 코드는 간단하다.

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

특정 조건에 오버라이드 되어야 하는 응답이 있는게 아니라면 getCurrentResult를 사용해서 현재 상태를 가져온다. getCurrentResult는 resultData.current 와 같다.

여기까지의 대략적인 흐름을 정리해보면 다음과 같다.

1. useQuery 훅은 _useQuery 구현체의 wrapper이고, _useQuery 구현체는 useQueryInternals의 반환값에 대한 메모이제이션이다.
2. useQueryInternals 에서 의심스러운 부분들을 보다보니 쿼리 결과를 반환하는 useObservableSubscriptionResult 훅이 있었다.
3. useObservableSubscriptionResult 훅을 보니 useSyncExternalStore 훅을 사용해서 쿼리 결과에 대한 구독과 onNext, onError 콜백을 가진 옵저버 구현체로 이어진다.
4. 결국 요청을 보내는 곳을 찾으려면 observable을 구독하는 곳이 아니라 만드는 곳을 봐야 한다.

다시 생각해보니 이미 useObservableSubscriptionResult 라는 훅 이름 자체가 구독을 관리하고 결과를 통해 콜백 호출과 상태 업데이트를 하는 곳이라는 이름이 명확하다! 그렇다면 실질적인 요청을 보내는 곳은 인자로 전달되는 observable 객체를 만드는 부분일 것이다. 이를 명심하고 다시 한 번 useQueryInternals 훅을 살펴보니 의심스러운 곳이 보인다.

```ts
  const [{ observable, resultData }, onQueryExecuted] = useInternalState(
    client,
    query,
    options,
    renderPromises,
    makeWatchQueryOptions
  );
```

useInternalState 라는 훅의 이름만 대충 보고 내부 상태만 관리하는 줄 알고 넘겼는데 자세히 보니 반환값에 observable이 있다. 세부 구현을 살펴보니 훅 구현체에서 observable을 선언해주는 곳을 확인 할 수 있다!

```ts
     observable:
        (renderPromises &&
          renderPromises.getSSRObservable(makeWatchQueryOptions())) ||
        client.watchQuery(
          getObsQueryOptions(void 0, client, options, makeWatchQueryOptions())
        ),
```

SSR 환경에서 renderPromises에 이미 보관된 SSR Observable이 있는지 확인하고, 있다면 해당 Observable을 반환한다. 클라이언트 기준으로는 client.watchQuery 를 호출하면 Observable이 반환되는 모양이다.

ApolloClient.watchQuery는 QueryManager의 watchQuery의 wrapper이다.

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

드디어 observable을 실질적으로 만들어주는 코드를 만났다!

ObservableQuery 생성자 코드를 빠르게 살펴보면...

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

ObservableQuery 객체는 zen-observable 구현체를 상속받아 구현되어 있는데, observable을 구독하는 observers가 아직 없다는 것은 해당 쿼리를 이제 막 구독하기 시작했다는 의미와 동일하다. 이 경우에 this.reobserve 가 호출된다.

reobserve 메소드는 reobserveAsConcast 의 wrapper이다.

Concast라는 용어가 생소했는데 Concast 객체 선언부에 주석으로 설명이 잘 되어 있었다.

> Concast\<T\> 옵저버블은 주어진 소스들을 하나의 겹치지 않는 T 시퀀스로 연결하고, 자동으로 모든 프로미스를 풀어내며, 그 시퀀스의 T 요소들을 여러 구독자에게 방송합니다. 이 과정에서 중간 옵저버블 래퍼 객체를 많이 생성하지 않습니다.
>
> Concast에는 여러 옵저버가 구독할 수 있지만, 각 소스 옵저버블은 최대 한 번의 구독 호출만 보장받으며, 그 결과는 모든 옵저버에게 멀티캐스트됩니다.

reobserveAsConcast 내부에서는 `const { concast, fromLink } = this.fetch(options, newNetworkStatus, query);` 형태로 실제 fetch가 일어난다.

fetch 메소드는 queryManager의 fetchConcastWithInfo 함수를 호출하고, 해당 함수에서는 fetchQueryByPolicy 를 호출한다.

fetchQueryByPolicy 구현체에서는 여러 fetchPolicy에 따른 실질적인 요청을 볼 수 있다. (switch 최상단 default: 로 cache-first를 기본 설정으로 세팅하는 디테일)

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

resultsFromCache 는 캐시에서 쿼리 결과를 조회하고, resultsFromLink 는 실질적인 요청을 통해서 데이터를 가져온다. resultsFromLink는 QueryManager의 getResultsFromLink로 이어진다.

```ts
   return asyncMap(
      this.getObservableFromLink(
        linkDocument,
        options.context,
        options.variables
      ),
      // ...
```

getObservableFromLink를 거쳐 ApolloLink.execute에 도달한다.

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

드디어 도착했다! ApolloLink의 request 인자로 query 오퍼레이션을 payload 형태로 변환해주는 프로세스가 있고, 실질적인 요청은 이 곳에서 이뤄진다.

아폴로 클라이언트는 http 요청에 필요한 구현체들을 자유롭게 주입할 수 있는 구조로 되어 있으며 이러한 구현체는 아폴로 클라이언트 초기화시 설정하는 httpLink 구성에서 자유롭게 정의할 수 있기 때문이다.

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

HttpLink는 createHttpLink를 통해 생성되는데, httpLink 생성시 fetch를 명시적으로 주입하지 않으면 각 환경의 backupFetch를 사용한다.

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

마침내 실질적인 fetch 요청을 보내는 곳을 발견했다. currentFetch의 평가에 대해 재미있는 부분이 있는데,

> linkOptions.fetch(preferredFetch)가 제공된 경우 이를 사용하고, 그렇지 않으면 현재 전역 window.fetch 함수를 사용합니다(문제 #7832 참조). 만약 이것도 불가능하다면, 모듈이 처음 평가될 때 저장된 backupFetch 함수를 사용합니다. 이 마지막 옵션은 window.fetch가 제거되는 상황에 대비한 것으로, 가능성은 낮지만 완전히 배제할 수는 없습니다.

fallback으로 전역 window.fetch를 사용하는 것은 놀랍지 않았는데, window.fetch가 없어지는 상황까지 고려하여 backup용으로 모듈 평가 시점의 backupFetch를 가져와서 사용하는 점이 재미있었다. 설령 `createHttpLink` 호출 시점의 전역 fetch가 어떠한 이유로든 전역 참조에서 제거되더라도 평가 시점에 참조한 fetch 메소드를 사용할 수 있다.

## 소감

개인적으로 ApolloClient 코드들이 읽기 쉬운 편이라고 생각하는데, 그 중에서도 쉬운 useQuery를 골랐음에도 참 읽을게 많아 후반부엔 좀 지치는 감이 있었다. 그래도 전체적인 흐름이나 Observable 패턴의 구현체들을 봐서 새로웠고, Concast 같은 새로운 개념들도 알게 되어 좋았다.

## 참고

useQuery의 인자는 왜 객체 형태가 아닌걸까?
https://github.com/apollographql/apollo-client/pull/11869#discussion_r1665511736
