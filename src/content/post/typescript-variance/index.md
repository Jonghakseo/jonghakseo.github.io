---
title: "TypeScript의 공변성과 반공변성"
description: "TypeScript에서 공변성과 반공변성이 함수 타입에 어떻게 적용되는지 예시와 함께 알아봅니다."
publishDate: "2023-07-14"
tags: ["typescript"]
lang: "ko"
translationSlug: "typescript-variance-en"
---

## 공변성과 반공변성

'공변성(Covariance)'과 '반공변성(Contravariance)'은 Typescript를 다루는 개발자라면 누구나 매일매일 접하고 또 사용하는 개념이지만, 나를 포함해서 해당 개념을 매번 의식하고 인터페이스를 설계하는 사람은 많지 않을 것이다.

공변성과 반공변성이 타입스크립트에서 가지는 의의를 이해하기 전에, 먼저 공변성이 뭔지, 반 공변성이 뭔지부터 이해하고 가보자.

### 공변성

더 많이 파생된(더 구체화된) 형식을 사용할 수 있다.

I<T'> 인스턴스 타입을 I<T> 형식의 변수에 할당할 수 있다.

### 반공변성

덜 파생적인(더 제네릭한) 형식을 사용할 수 있다.

I<T> 인스턴스를 I<T'> 형식의 변수에 할당할 수 있다.

![공변성과 반공변성 개념도](./img1.png)

쉽게 풀어서 설명하려고 해도 되지 않으니 예시를 들어서 한 번 살펴보자.

다음과 같은 타입 A,B,C가 있다.

```typescript
type A = string
type B = string | number
type C = string | number | null
```

이제 함수 Foo라는 타입을 선언해보자.

```typescript
type Foo = (b: B) => B;
```

이제 이 함수의 타입을 지키면서 안전하게 호출할 수 있는 함수는 다음 중 어떤 함수일까?

```typescript
const foo1: Foo = (a: A) => {
  return {} as A;
};

const foo2: Foo = (a: A) => {
  return {} as C;
};

const foo3: Foo = (c: C) => {
  return {} as C;
};

const foo4: Foo = (c: C) => {
  return {} as A;
};
```

A는 B의 서브타입이며, B는 C의 서브타입이다. 그러므로 A는 C의 서브타입이다.

(반대의 관계는 슈퍼타입)

**foo1부터 살펴보자. 해당 함수는 안전한가?**

인자로 받는 A는 B의 서브타입으로, B에서 number가 빠져있다. foo1을 호출하는 곳에서는 Foo의 인터페이스에 맞게 인자로 number를 넘겨줄 수 있을텐데, 그에 대한 처리가 되어있지 않아 위험해보인다.

같은 이유로 같은 인자를 받는 foo2 역시 위험해보인다.

**foo3을 살펴보자. 해당 함수는 안전할까?**

인자로 받는 C는 B의 슈퍼타입으로, B에서 null이 추가된 타입이다. foo3을 호출하는 곳에서는 Foo의 인터페이스에 맞게 string | number를 넘겨줄 수 있다. 이 경우 안전하다고 할 수 있겠다.

이제 반환값을 보자. 반환값인 C는 B에서 null이 추가된 타입이다. foo3을 호출하는 곳에서는 Foo의 인터페이스에 맞게 반환값인 string과 number에 대한 처리를 하게 될 것이다. 예상치 못한 null이 반환될 수 있으니 위험해보인다.

![foo3 분석](./img2.png)

**foo4를 살펴보자. 해당 함수는 안전할까?**

인자로 받는 C는 foo3에서 살펴봤듯 안전하다고 할 수 있고, 반환값을 살펴보자. 반환값인 A는 B에서 number가 제거된 타입이다. foo4를 호출하는 곳에서는 Foo의 인터페이스에 맞게 반환값인 string | number에 대한 처리를 하지만, 실제로 반환되는 타입은 string일 것이다.

그러므로 foo4는 인자와 반환값 모두 안전한 함수이다!

### 뭔소리야?

직관적으로 이해하기 쉽지 않아서 설명도 실제 호출을 기준으로 했지만, 설명을 듣고 나서도 쉽사리 이해되지 않는다.

하지만 위 예시를 통해서 두 가지의 규칙을 발견할 수 있었는데,

1. 함수의 파라미터는 더 좁은 타입을 사용할 수 있다. (반공변성 - 더 구체적인 타입을 사용할 수 있다)
2. 함수의 반환값은 더 넓은 타입을 사용할 수 있다. (공변성 - 더 일반적인 타입을 사용할 수 있다)

타입스크립트에서 함수의 타입은 위의 규칙으로 동작한다.

단, 위 가정은 타입스크립트의 strict flag, 정확히는 strictFunctionTypes flag를 활성화 했을때의 동작이며, 해당 flag가 off인 경우 함수의 파라미터는 공변성과 반공변성을 모두 갖도록 동작한다. 이 경우에는 이변성(Bivariance)을 갖고 있다고 한다.

#### 왜?

사용 사례에서 살펴보았듯, 파라미터가 반공변성을 가지는 것이 안전한데 왜 타입스크립트의 기본 설정은 그렇지 않은걸까?

사실 모든 사용 사례에서 파라미터가 반공변성을 가지는 것이 적절한 것은 아니다.

Array.push 메소드의 시그니처를 살펴보자.

```typescript
interface Array<T> {
    push(...items: T[]): number;
}
```

Array<string | number> 에 string을 하나 넣고 싶다면 push 메소드를 사용하게 될 것이다.

이 경우 push()의 타입은 (...items: Array<string | numebr>) => number 가 된다.

함수 파라미터의 반공변성에 의거하면, push 메소드에 (...items: Array<string>) => number를 할당할 수 없다.

이제 뭔가 또 논리적으로 이상하다.

숫자와 문자로 이루어진 배열에 문자를 추가하는 동작이 위험하지 않기 때문에 이 경우에는 함수의 파라미터가 공변성을 가지는 것이 맞다는 결론이 나오게 된다.

![Array.push와 공변성](./img3.png)

#### --strict 환경에서도 Array.push() 문제 없던데?

맞다. 나를 포함한 많은 타입스크립트 개발자들이 TypeSafe한 개발 환경을 위해 strict flag를 켜두지만, Array.push를 사용하면서 반공변성으로 인한 곤란함을 겪지는 않는다.

비밀은 메소드를 선언하는 형태에 있는데,

```typescript
interface Array<T> {
    push(...items: T[]): number;
}

interface Array<T> {
    push: (...items: T[]): number;
}
```

위의 방식의 선언과, 아래 방식의 선언이 다르게 동작하는(...) 것이다.

https://github.com/microsoft/TypeScript/pull/18654

> The stricter checking applies to all function types, except those originating in method or construcor declarations. Methods are excluded specifically to ensure generic classes and interfaces (such as Array<T>) continue to mostly relate covariantly.

정말 미묘하면서 알기 힘든 포인트로 공변성을 다룰 수 있는 길을 열어둔 것이다.

> By the way, note that whereas some languages (e.g. C# and Scala) require variance annotations (out/in or +/-), variance emerges naturally from the actual use of a type parameter within a generic type due to TypeScript's structural type system.

C#이나 Scala 혹은 Kotlin처럼 이러한 개념을 드러내는게 좋았을까?

적어도 인지하기 어려운 미묘한 문법 차이로 공변성을 제어하는 것 보다는 확실한 예약어를 추가하는게 낫지 않았을까...? 하는 생각이 든다.

![TypeScript PR 스크린샷](./img4.png)

**추가**

typescript 4.7 부터 타입 제네릭에 공변, 반공변에 대해 명시적으로 표기가 가능해졌다.

```typescript
type Getter<out T> = () => T;

type Setter<in T> = (value: T) => void;
```

https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#optional-variance-annotations-for-type-parameters

### 참고

- https://learn.microsoft.com/ko-kr/dotnet/standard/generics/covariance-and-contravariance
- https://seob.dev/posts/%EA%B3%B5%EB%B3%80%EC%84%B1%EC%9D%B4%EB%9E%80-%EB%AC%B4%EC%97%87%EC%9D%B8%EA%B0%80/
- https://edykim.com/ko/post/what-are-covariance-and-contravariance/
- https://github.com/microsoft/TypeScript/pull/18654
