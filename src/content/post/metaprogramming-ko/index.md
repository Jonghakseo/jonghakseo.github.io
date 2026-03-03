---
title: "메타프로그래밍"
publishDate: "2023/09/10"
description: "메타프로그래밍이란 무엇인지에 대한 글입니다."
tags: ["typescript"]
lang: "ko"
translationQuality: "draft"
---

## 메타프로그래밍이란?

### 메타프로그래밍? 메타인지?

메타프로그래밍이라는 개념을 이해하기 위해서는 먼저 "메타"라는 단어를 이해해야 합니다.
메타인지라는 용어를 통해 어느 정도 익숙한 메타라는 단어는 어디서 온 것일까요?

**메타(Meta)** 는 그리스어에서 유래한 영어 단어로, '~에 대한' 또는 '~을 넘어선'이라는 뜻을 가지며, 더 높은 수준에서 대상이나 개념을 추상화하고 반영하는 것을 의미합니다.
즉, 메타데이터는 데이터에 대한 데이터이고, 메타인지는 인지에 대한 인지입니다.

좀 더 풀어보겠습니다. 메타인지란 내가 생각하고 있다는 것에 대해 생각하는 것이고, 메타프로그래밍은 코드가 스스로를 "조작"하는 것입니다.
이는 프로그램이 자신의 구조와 동작을 읽고, 분석하고, 수정할 수 있음을 의미합니다.

인지 주체인 인간은 자신의 인지를 객체화하기 위해 더 높은 수준에서 자신의 인지를 인식할 수 있습니다.
자신의 인식을 인식하고 있는 자아도 인식할 수 있습니다.
그리고 그 자아를 인식하고 있는 자아를 인식하고 있는 자아를... 끊임없이 더 높은 수준으로 올라갈 수 있습니다.

메타프로그래밍의 개념도 메타인지와 비슷합니다.
프로그램이 자신의 명령어나 구조를 검사하고 필요에 따라 수정하거나 새로운 것을 생성할 수 있는 능력을 말합니다.
물론 이를 위해서는 코드가 자기 자신을 인식하고 이해할 수 있어야 합니다.

메타프로그래밍은 프로그램에 더 큰 유연성과 동적 기능을 부여할 수 있게 합니다.
코드는 더 이상 단일 실행 흐름을 따르지 않고, 실행 중에 자기 자신을 수정할 수 있습니다.

특히 JavaScript와 같은 동적 언어의 런타임에서 메타프로그래밍은 강력한 도구가 될 수 있습니다.

## JavaScript에서의 메타프로그래밍

[MDN의 메타프로그래밍](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming) 설명을 읽어보세요.

> Proxy와 Reflect 객체를 사용하면 기본 언어 동작(예: 속성 조회, 할당, 열거, 함수 호출 등)을 가로채고 사용자 정의 동작을 정의할 수 있습니다. 이 두 객체를 사용하면 JavaScript의 메타 수준에서 프로그래밍할 수 있습니다.

메타프로그래밍을 위해 JavaScript는 Reflect와 Proxy 객체를 지원하며, 이를 통해 언어의 기본 동작을 가로채고 사용자 정의 동작을 제공할 수 있습니다.

### 리플렉션(Reflection)

리플렉션은 프로그램이 런타임에 자신의 구조와 동작을 검사, 평가, 수정할 수 있는 능력입니다. 런타임에서 프로그램을 관찰하고 수정하는 데 사용되며 메타프로그래밍의 핵심 개념입니다.

#### JavaScript Reflect

JavaScript는 Reflect 객체를 통해 리플렉션을 구현합니다. Reflect는 함수 객체가 아니며 모든 속성과 메서드가 정적입니다.

다음은 Reflect를 사용하여 객체에 속성이 존재하는지 확인하는 예시입니다.

```javascript
Reflect.has(Object, "assign"); // true
Object.hasOwnProperty("assign"); // true
```

Reflect를 사용하여 Object의 'assign' 존재 여부를 확인하는 코드와 Object.hasOwnProperty 메서드를 사용하여 'assign' 존재 여부를 확인하는 코드를 비교해 봅시다.

반환값에는 차이가 없지만, 호출 방식에서 이미 메타프로그래밍의 개념이 드러납니다.

Reflect.has(Object, "assign")는 Object라는 전역 객체에 'assign'이라는 속성이 존재하는지 확인합니다.

"Object.hasOwnProperty('assign')도 같은 일을 하는 거 아닌가요?"라고 생각할 수도 있고, 맞는 말입니다.

하지만 호출 방식을 살펴봅시다.

Reflect.has(Object, "assign")에서는 **Reflect.has** 메서드가 Object에 'assign'이 있는지 확인합니다.
반면 Object.hasOwnProperty("assign")에서는 **Object** 자체가 'assign'이 있는지 확인합니다.

앞서 메타프로그래밍은 코드가 자기 자신을 인식하는 것이라고 말했습니다. 이것이 Reflect를 통해 Object에 assign이 있다는 것을 아는 것과 Object에서 hasOwnProperty를 호출한 결과를 받는 것의 차이입니다.

또 다른 차이점은 Reflect.has가 객체의 프로토타입 체인에 존재하는 속성도 감지할 수 있다는 것입니다.

```javascript
const x = {
  y: 0
}
// x에는 'toString'이라는 속성이 없지만 프로토타입 체인에 존재함
Reflect.has(x, "toString"); // true
x.hasOwnProperty("toString"); // false

!!x['toString'] // true
```

"그냥 x['toString']으로 확인하면 되잖아요!"

하지만 앞서 말했듯이, 메타프로그래밍은 실행 결과를 확인하는 것이 아니라 더 높은 수준에서 자기 자신을 인식하는 것입니다.

조금 다른 예시를 살펴봅시다.

```javascript
let y = 0

const x = {
  get y(){ return ++y }
}

x.y;                  // 1
Reflect.has(x, "y");  // true
x.y                   // 2
!!x["y"]              // true
x.y                   // 4
x.hasOwnProperty("y") // true
x.y                   // 5
```

객체 x가 y에 접근할 때마다 반환값이 증가하도록 만들었습니다.
x.y를 통한 참조는 y를 1 증가시키지만, Reflect.has를 통한 속성 확인은 y를 증가시키지 않습니다.

hasOwnProperty를 통한 확인도 y를 증가시키지 않지만, 앞서 언급했듯이 hasOwnProperty는 프로토타입 체인에 존재하는 속성을 감지하지 못합니다.

따라서,

1. 객체 x에 y가 있는지 확인 = Reflect.has(x, "y")
2. 객체 x의 y에 접근하여 결과를 확인 = !!x["y"] (본질적으로 x.y와 동일)
3. 객체 x에게 y가 있는지 물어보기 = x.hasOwnProperty("y")

이 세 가지는 매우 다른 것입니다.


### 프록시(Proxy)

프록시는 프로그래밍에서 자주 언급되는 개념으로, 디자인 패턴인 프록시 패턴으로도 익숙합니다.
실제 객체에 접근하기 전에 그 동작을 가로채거나 변경하는 데 사용되는 패턴으로, 주로 캐싱이나 유효성 검사 목적으로 사용됩니다.

#### JavaScript Proxy

JavaScript에서는 Proxy 생성자로 프록시 객체를 만들고, 접근, 수정, 호출 등의 동작을 제어할 수 있습니다.

```javascript
const target = {
  message1: "hello",
  message2: "everyone",
};

const handler = {
  get(target, prop, receiver) {
    return "world";
  },
};

const proxy = new Proxy(target, handler);

proxy.message1; // "world"
proxy.message2; // "world"
```

위와 같이 Proxy 생성자의 두 번째 인자인 handler를 통해 target을 직접 수정하지 않고 동작을 제어할 수 있습니다.

## JavaScript에서의 메타프로그래밍 활용 사례

JavaScript 메타프로그래밍은 코드를 더 유연하고 재사용 가능하게 만들 수 있습니다.
프록시를 통한 기본 동작 재정의, 리플렉션을 통한 동적 프로그래밍 등에 활용할 수 있습니다.

### 활용 사례 1: 유효성 검사

메타프로그래밍은 객체의 동작을 검증하는 데 사용할 수 있습니다.
예를 들어, 프록시를 사용하여 객체의 동작을 검증할 수 있습니다.

```javascript
const target = {
  message1: "hello",
  message2: "everyone",
};

const handler = {
  get(target, prop, receiver) {
    if (!Reflect.has(prop)) {
      throw new Error("Property does not exist");
    }
    return Reflect.get(...arguments);
  },
};

const strictTarget = new Proxy(target, handler);

target.message3; // undefined
strictTarget.message3; // Error: Property does not exist
```

위 예시에서는 속성이 존재하지 않으면 에러를 던지는 프록시 객체를 생성했습니다.

### 활용 사례 2: 캐싱

메타프로그래밍은 객체의 동작을 캐싱하는 데 사용할 수 있습니다.
예를 들어, 프록시를 사용하여 객체의 동작을 캐싱할 수 있습니다.

```javascript
const cache = new Map();

const _fibonacci = (n) => {
  if (n <= 1) {
    return 1;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
};

const handler = {
  apply: (target, thisArg, args) => {
    const [num] = args;
    if (cache.has(num)) {
      return cache.get(num);
    }
    const result = Reflect.apply(target, thisArg, args);
    cache.set(num, result);

    return result;
  }
}

const fibonacci = new Proxy(_fibonacci, handler);

fibonacci(5);
fibonacci(4);
fibonacci(3);
```

위 예시에서는 피보나치 함수의 결과를 캐싱하는 프록시 객체를 생성했습니다.

## JS 메타프로그래밍 개념 정리

메타프로그래밍은 프로그램이 자기 자신을 검사하고 수정하는 방식을 의미하며, JavaScript에서는 주로 리플렉션이나 프록시를 통해 이루어집니다.
이를 이해하고 적절하게 활용하면 더 생산적이고 유연한 코드를 작성할 수 있습니다.


## 레퍼런스

- (KR) https://www.youtube.com/watch?v=NmAYfhGBP-I
- (KR) https://ko.wikipedia.org/wiki/%EB%A9%94%ED%83%80
- (EN) https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming
- (EN) https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
