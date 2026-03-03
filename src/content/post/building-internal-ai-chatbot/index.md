---
title: "사내 AI 챗봇 서비스 구축하기"
description: "Azure OpenAI와 Next.js로 사내 AI 챗봇을 구축한 경험과 트러블 슈팅 과정을 공유합니다."
publishDate: "2025-02-20"
tags: ["ai", "nextjs"]
lang: "ko"
translationSlug: "building-internal-ai-chatbot-en"
---

안녕하세요. 크리에이트립(Creatrip) FE 개발자 서종학입니다.

오늘은 작년 크리스마스 연휴를 사용해 만든 사내 AI 챗봇 서비스를 구축한 경험과 그 과정에서의 트러블 슈팅을 통해 배운 것들을 공유하려고 합니다.

## 구현 계기

크리에이트립의 내부 구성원들은 저마다의 업무 영역에서 ChatGPT를 활발하게 사용하고 있는데요, 번역에서부터 톤 교정 등의 작문 작업, 질문/검색 등 그 용도는 매우 다양해요.

이러한 상황에서 마침 저희에게는 마이크로소프트 스폰서십을 통해 받은 약 2억 원의 무료 크레딧이 남아있는 상태였습니다. 번역 등 여러 AI 작업에 Azure OpenAI 서비스를 사용하고 있었지만, 남은 유효기간 대비 크레딧의 소진율은 크게 높지 않았어요.

이에 프로덕트 팀 내부에서 Azure OpenAI 사용을 통해 크레딧을 소진하면서 구성원들의 유료 ChatGPT 사용을 대체하고, 내부 구성원들의 필요에 맞는 맞춤 기능도 넣을 수 있는 LLM 기반의 AI 챗봇 서비스가 있으면 좋지 않을까에 대한 의견이 제시되었어요.

때마침 저도 새로 하는 작업에서 몇 가지 생소한 GraphQL 쿼리와 뮤테이션을 찾아야 할 일이 있었는데요, 이 과정에서 스키마의 일부를 LLM에 던지고 필요한 오퍼레이션을 유추하게끔 하는 작업이 생각보다 편해서 이 기능을 자체 챗봇에 연동하면 편하겠다는 생각도 들었습니다.

## 구현 과정

챗봇 구현에 앞서, 모든 것을 0에서 시작하지 않기 위해 보일러 플레이트를 먼저 찾아봤는데요, 높은 퀄리티와 신뢰성을 기준으로 찾다 보니 vercel에서 유지보수를 하는 `nextjs-ai-chatbot` 템플릿을 발견하게 되었습니다.

[데모](https://chat.vercel.ai/)의 사용성도 괜찮았고 기술 스택 역시 익숙한 Next.js, 개인 프로젝트에서 사용해 본 auth.js, tailwindcss, shadcn/ui, 그리고 대략 알고 있는 drizzle 등으로 이루어져 있었습니다. 특이한 점이라면 React 19-rc 버전을 사용하고 있다는 점이었는데, 이는 추후 모노레포 통합 시도 과정에서 큰 걸림돌이 되었어요.

### 크리에이트립 구성원에 대한 인증 연동

템플릿을 포크한 이후 맨 처음으로 구축한 부분은 크리에이트립 인증 서버와의 통합이었습니다. 사내 서비스로 구축하는 만큼, 내부 구성원분들의 인증 절차를 그대로 사용할 필요가 있었는데요,

먼저 UI에서 불필요한 Sign up 페이지를 제거하고 크리에이트립 어드민의 슬로건인 `Everyone is an insider` 를 넣어 제법 그럴듯하게 만들어 주었어요.

Auth.js(구 NextAuth)의 기본적인 구성은 이미 되어있는 상태였기 때문에, 기본 설정에서 `Credentials.authorize` 부분을 추가적으로 수정해 주는 방식으로 인증을 구현했습니다.

**`app/(auth)/auth.ts`** 기존 코드

```ts
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }) {
        // 이메일과 패스워드를 통해 DB에서 유저 확인. 없으면 회원가입 처리
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // jwt 내부에 어떤 정보를 담을지 결정
      return token;
    },
    async session({ session,token }) {
     // session에 어떤 정보를 담을지 결정
      return session;
    },
  },
});
```

기존 구현 코드를 보면 자체적으로 구현된 서버의 계정 정보를 통해 인증, accessToken 발급, session 정보 파싱을 해주고 있어요.

Auth.js의 `Credentials.authorize` 코드는 유저 세션에 대한 탐색이 가능한 콜백 메소드를 구현하는 곳이에요. 이 곳에서 주로 DB 조회 혹은 다양한 OAuth 기반 서드파티와의 연동을 통해 인증을 구현하게 됩니다.

`callbacks.jwt` 는 JWT에 담을 유저 정보를 결정하는 곳이에요. authorize 반환 값에 따라 토큰에 담길 수 있는 유저 정보가 있을 수도, 없을 수도 있기 때문에 예제에서는 유저 객체의 존재 여부를 확인 후 토큰에 정보를 담는 방식을 사용합니다.

마지막으로 `callbacks.session`은 이렇게 발급된 JWT를 클라이언트에서 파싱할 때 가져올 정보를 결정하는 곳인데요, `useSession, getSession, getServerSession(서버)` 등의 메소드를 사용해서 세션 정보를 가져올 수 있어요.

**`app/(auth)/auth.ts`** 변경 코드

```ts
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }) {
       // 크리에이트립 로그인
        //...
        // 어드민 권한 확인
        if (user.level !== 'ADMIN') {
          return null;
        }
        // 기존 유저인지 확인 후 회원가입
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
      // jwt 내부에 어떤 정보를 담을지 결정
      return token;
    },
    async session({ session,token }) {
     // session에 어떤 정보를 담을지 결정
      return session;
    },
  },
});
```

변경된 로직에서는 `authorize` 과정에서 저희 크리에이트립의 인증 정보를 검증하는 로직이 추가되었어요.

크리에이트립의 인증 절차를 통해 새로 가입이 된 유저는, 챗봇 서비스 서버에 유저로 등록되며 크리에이트립의 인증 정보를 함께 저장하게 됩니다.

당연하지만 해당 서비스는 회원 등급이 `ADMIN`인 내부 구성원들만 서비스 이용을 할 수 있도록 제한해 두었어요.

### Azure OpenAI 연동 과정에서의 수정사항

기존 템플릿에서는 `vercel/ai`, `vercel/@ai-sdk` 를 사용한 OpenAI 연동 코드가 있었는데요, Azure OpenAI 연동을 위해 이 구현체를 수정해줄 필요가 있었습니다.

### 초기 설정 및 연동 과정

**`lib/ai/index.ts`** 기존 코드

```ts
import { openai } from '@ai-sdk/openai';
import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';

import { customMiddleware } from './custom-middleware';

export const customModel = (apiIdentifier: string) => {
  return wrapLanguageModel({
    model: openai(apiIdentifier),
    middleware: customMiddleware,
  });
};
```

아주 간단하게 구현되어 있었던 이 코드에서 openai 함수는 LanguageModel이라는 높은 수준으로 추상화된 구현체를 반환하는데요, 이 부분을 azure로 수정해 줘야 했어요.

**`lib/ai/index.ts`** 변경 코드

```ts
import {createAzure} from '@ai-sdk/azure';
import {experimental_wrapLanguageModel as wrapLanguageModel} from 'ai';
import {customMiddleware} from './custom-middleware';

const azure = createAzure({
  baseURL: process.env.AZURE_BASE_URL
})
export const customModel = (apiIdentifier: string) => {
  return wrapLanguageModel({
    model: azure(apiIdentifier),
    middleware: customMiddleware,
  });
};
```

`@ai-sdk/azure`의 `createAzure`를 대신 호출하는 것으로 간단하게 azure 모델의 구현체를 수정할 수 있었습니다.

### 트러블 슈팅

사실 위 작업이 마냥 간단하지만은 않았는데요, 처음에 추가한 `AZURE_BASE_URL` 환경변수의 형태가 일치하지 않아 API 요청이 실패하는 문제가 있었어요.

더군다나 잘못된 baseURL을 입력한 상태에서 발생한 에러가 개발 단계에서 정상적으로 노출이 되지 않았습니다…! 뭔가 호출이 제대로 안 되고 있다는 것은 알 수 있었으나 `@ai-sdk/azure` 내부의 높은 추상화 과정에서 일부 에러에 대한 명확한 로깅이 되지 않고 있었어요.

결국 라이브러리 내부 소스코드에서 fetch를 하는 실제 코드에서 catch를 통해 잡힌 azure 응답 에러 객체를 콘솔로 확인하고 나서야 정확한 baseURL을 설정 할 수 있었습니다.

### 내부 GraphQL 스키마 조회 및 쿼리 기능 추가

기본적인 인증과 LLM api 연동을 끝내고 나니, 개인적으로 가장 필요로 했던 GraphQL 스키마 조회 기능을 먼저 구현하고 싶었습니다.

### Function Calling이란?

LLM 챗봇에 특정 기능을 구현한다는 것은 어떤 것을 의미할까요? 프롬프트를 조정하여 LLM이 특정 기능을 더 잘하게 만들거나 컨텍스트를 제공하는 방법도 있지만, 보편적으로는 LLM이 자의적으로 호출할 수 있는 특정 기능을 구현하게끔 제공하는 것을 말해요.

[OpenAI Function calling](https://platform.openai.com/docs/guides/function-calling) 문서를 보면 이에 대해 자세히 이해할 수 있는데요, 쉽게 말해 LLM에 `'네가 사용할 수 있는 도구들은 1,2,3이 있고, 각 도구는 이렇게 쓸 수 있으니, 네가 필요하다는 생각이 들면 호출해서 결과를 참고해서 응답해'` 라고 알려주는 방식이에요.

`vercel/ai` 등에서는 이러한 동작을 typeSafe하고 편하게 구현할 수 있도록 zod등과 통합된 인터페이스를 제공하고 있어요. 기존 템플릿에서도 이미 이렇게 구현된 기능은 쉽게 볼 수 있는데요, 대표적으로는 날씨를 조회하는 기능인 `getWeather` 이 좋은 예시로 제공되어 있습니다.

```ts
const result = streamText({
  model: customModel(model.apiIdentifier),
  system: systemPrompt,
  messages: coreMessages,
  maxSteps: 5,
  experimental_activeTools: allTools,
  tools: {
    getWeather: {
      description: 'Get the current weather at a location',
      parameters: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
      execute: async ({ latitude, longitude }) => {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
        );

        const weatherData = await response.json();
        return weatherData;
      },
    },
```

개발자는 LLM에 getWeather이라는 함수를 호출할 수 있다는 것을 알려주고, 해당 함수가 어떤 역할을 하는지 description을 통해 알려줍니다.

parameters에는 zod를 활용해 LLM이 적절한 input을 통해 이러한 tool을 호출할 수 있게끔 스키마를 제공하고, 런타임에 잘못된 input을 요청할 경우 검증이 가능하도록 해줘요.

LLM이 함수를 호출하면 execute에서는 실행의 결과를 LLM에 반환해주는 방식으로 동작해요.

### GraphQL 스키마 조회 기능 구현

이제 위에서 소개해 드린 tools 인터페이스를 사용하여 본격적인 기능 구현을 해보려고 해요. 크리에이트립의 유저페이지와 어드민에서 호출하는 모든 API는 GraphQL 프로토콜을 사용하고 있어요.

서비스 초창기인 2021년부터 쌓아온 GraphQL 스키마의 양이 만만치 않아 원하는 동작을 하기 위한 오퍼레이션이 무엇인지 찾기 쉽지 않았어요. 이 문제를 해결하기 위해 원하는 동작을 설명하면 GraphQL 오퍼레이션을 찾아주는 기능을 구현하려고 해요.

빠른 검증을 위해 schema.graphql 파일은 로컬 파일을 `fs.readFile` 등으로 읽어와 쿼리 혹은 뮤테이션의 선언부를 모두 제공하는 방식으로 구현하였고 그 구현은 대략적으로 다음과 같아요.

**`getGraphQLSchema`** 초기 코드

```ts
getGraphqlSchema: {
  description: 'Get Creatrip GraphQL schema',
  parameters: z.object({
    kind: z.enum(['all-queries', 'all-mutations', 'type']),
    typename: z.string(),
  }),
  execute: async ({ kind, typename }) => {
    try {
     // 로컬에 있는 schema.graphql 파일을 읽어옴
      const schema = readFileSync('schema.graphql');
      const schemaString = schema.toString();
      // type에 따라 분리
      const schemaStringSplit = schemaString.split('}\n\n').map((line) => line + '}\n\n');
      const res = (() => {
        switch (kind) {
          case 'all-queries':
            return schemaStringSplit.find((line) => line.startsWith('type Query'));
          case 'all-mutations':
            return schemaStringSplit.find((line) => line.startsWith('type Mutation'));
          case 'type':
            return schemaStringSplit.find(
              (line) =>
                line.startsWith(`type ${typename}`) ||
                line.startsWith(`enum ${typename}`) ||
                line.startsWith(`input ${typename}`),
            );
        }
      })();
      return res ? `\`\`\`gql\n${res}\n\`\`\`` : "Couldn't find the schema";
    } catch (error) {
      return `error: ${error}`;
    }
  },
},
```

매우 간단한 구현으로 원하는 동작을 충분히 하고 있어 매우 만족스러웠지만 몇 번 기능을 테스트해보니 개선할 부분들이 보였는데요,

1. 쿼리 혹은 뮤테이션의 전체 시그니처를 가져오다보니 컨텍스트에 포함되는 토큰이 너무 많아짐
2. 위 이유와 더불어 매 요청의 크기가 너무 커져 응답속도가 느려짐

**`readGraphQLSchema`** 개선 코드

```ts
readGraphQLSchema: {
  description:
    'Read local graphQL schema file. You can ask for all queries, all mutations, or a specific type. (e.g. input, enum, type, scalar), You can call this tool RECURSIVELY to get more specific information.',
  parameters: z.object({
    kind: z.enum(['queries', 'mutations', 'type']),
    purpose: z.string().describe('The purpose of the query or mutation'),
    typename: z.string().describe('The name of the type'),
  }),
  execute: async ({ kind, typename, purpose }) => {
    try {
      //...
      let res = (() => {
        //...
      })();

      async function narrowProperSchemaLines(type: 'Query' | 'Mutation') {
        const response = await generateText({
          model: customModel('gpt-4o'),
          system: `Get appropriate signature line or lines of ${type}. (e.g. When user request is "for weather data", response is "lastYearWeather(input: LastYearWeatherInput!): YearWeather" )`,
          prompt: `# ALL ${type} LIST\n\n${res}\n\nThis is user request: ["${purpose}"]\n Find proper signature of ${type}. If you find some relative signature lines, write them too. Please write just signature line or lines. DO NOT WRITE code block.`,
        });
        return response.text;
      }

      if (purpose && kind !== 'type') {
        res = await narrowProperSchemaLines(kind);
      }

      return res ? `\`\`\`gql\n${res}\n\`\`\`` : "Couldn't find the schema";
    } catch (error) {
      return `error`;
    }
  },
},
```

LLM에 input의 역할에 대해 추가적으로 명시해 주거나 기능의 설명이 좀 더 구체적으로 바뀐 부분도 있지만, 가장 큰 변화는 `narrowProperSchemaLines` 라는 내부 절차를 추가했다는 점이에요.

`narrowProperSchemaLines`은 유저가 쿼리 혹은 뮤테이션에 대한 정보를 요구한 경우 별도의 내부 LLM 호출을 통해 반환 컨텍스트를 줄이고 연관성이 높은 것으로 보이는 특정 쿼리/뮤테이션의 정보만 가져오도록 응답의 크기를 축소시키는 역할을 하고 있어요.

해당 방식으로 컨텍스트 내부에서 사용하는 토큰에 대한 절약과 응답속도 개선의 효과를 크게 얻을 수 있었어요.

### GraphQL 쿼리 요청 기능과 관련된 트러블 슈팅

가져온 GraphQL 스키마를 바탕으로 실제 쿼리를 요청할 수 있는 기능도 추가로 구현했는데요, 이 과정에서 예상치 못한 몇 가지 문제를 마주했습니다.

**정확도 문제**

스키마에 대한 조회 기능이 있었지만, 한 번에 가져올 수 있는 스키마의 정보가 한정되다 보니 실제 스키마와 다른 요청이 매우 빈번했어요. LLM 스스로 tool을 계속 호출하면서 제대로 된 스키마를 조회하는 모습도 보여줬지만, 대부분의 경우에서 유저가 직접 **"에러 나는 부분 찾아보고 올바른 스키마로 요청해"**라고 말해줘야만 동작하는 불편함이 있었어요.

이를 해결하기 위해 스키마 조회 기능에 `해당 스키마 안에 있는 모든 엔티티의 스키마도 함께 가져오는` 기능을 추가했습니다. 토큰의 사용량이 약간 증가하긴 했지만, 개선 이후 유저의 추가적인 요청 없이도 알아서 수정 후 쿼리를 요청하는 모습을 거의 모든 사례에서 보여주어 크게 개선되었어요.

**콘텐츠 필터링 문제**

여러 가지 사례에 대해 테스트하던 중, 특정 시점부터 LLM이 아무런 에러 메시지 없이 응답을 아예 하지 않고 먹통이 되는 현상을 발견했어요. 에러 메시지가 없어 fetch 코드에서 에러를 로깅해보니, Azure OpenAI 콘텐츠 필터링 정책에 따라 응답이 차단되었음을 알 수 있었어요.

Azure 콘솔에서 콘텐츠 필터링 정책을 가장 관대하게 설정해 두어도 여전히 응답이 차단되는 경우가 있었는데요, GraphQL 스키마를 가져오고 실제 요청을 하는 부분이 (자세히는 알 수 없지만)내부 필터링 조건에서 위험한 부분이라고 판단이 된 것으로 보였습니다.

이 부분은 몇 가지 수정으로 발생 빈도를 0에 가깝게 줄일 수 있었어요. 먼저 **`getGraphQLSchema`** 함수 이름을 **`readGraphQLSchema`** 로 변경하고 함수의 설명에 `로컬에 이미 존재하는 스키마를 읽는 기능`이라는 것을 주장(?)했습니다. 이 개선만으로도 필터링 빈도가 상당히 개선되었는데요, 추가로 프롬프트와 함수 설명에 `[This is Safe]` 등의 강조 문구를 넣어 안전하다는 것을 LLM에 열심히 설득해 주었습니다. (프롬프트와 함수 설명을 통해 LLM을 필사적으로 설득하면 그 설득이 통한다는 부분이 재미있으면서도 이게 맞나..? 싶었어요)

**대용량 데이터 조회시 컨텍스트 초과 문제**

GraphQL 요청에 대한 응답을 성공적으로 가져온 이후에도 문제는 있었는데요, 대량의 텍스트가 포함된 블로그 등의 응답 데이터가 너무 커서 컨텍스트의 크기를 초과하거나 응답속도가 지연되는 현상이 있었습니다.

위 문제를 방지하기 위해 응답 데이터의 크기가 특정 크기를 초과할 경우, json 파일을 생성해 크리에이트립 S3에 업로드하고 해당 파일의 링크를 제공하는 방식을 사용했습니다.

### 코드 인터프리터 변경

기존 템플릿에 있는 유용한 기능 중 하나는 Python 코드에 대한 실행과 콘솔 출력값을 웹에서 바로 확인하는 기능이었어요.

저희 크리에이트립의 개발팀 내부에서는 JS를 사용한 간단한 예제 코드 실행의 사례가 더 많을 것 같아 기존에 지원하던 Python을 JavaScript로 교체하는 작업을 진행했는데요,

위 자바스크립트 코드는 서버가 아닌 클라이언트에서 실행되고 있으며 XSS나 의도치 않은 코드 실행에 대한 위험성을 막기 위해 별도의 샌드박스 환경에서 구현될 필요가 있었어요.

### 안전한 JavaScript 런타임 환경 구현하기

JavaScript에서 문자열로 작성된 코드를 실행하는 방법은 크게 [`eval()`](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/eval), [`new Function()`](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Function) 두 가지 방법이 있어요. `eval()` 의 경우 성능, 보안 등의 문제로 인해 사용이 강력하게 비 권장되는 방식이며 대부분의 경우에서 문자열로 이뤄진 코드 실행에는 Function 생성자를 활용해요.

즉, 다음과 같은 방식으로 유저가 입력하거나 LLM이 생성한 코드를 실행할 수 있는데요,

```ts
const code = `console.log("hello world");`;

const excute = new Function(code);

excute(); // hello world
```

위 구현을 응용하여 실행 환경을 worker로 제한하고, 콘솔 출력값은postMessage로 전달받는 방식으로 안전한 런타임을 구현할 수 있었어요.

```ts
function safeEval(untrustedCode: string) {
  return new Promise((resolve, reject) => {
    const blobURL = URL.createObjectURL(
      new Blob(
        [
          '(',
          function () {
            const messages: any[] = [];
            const _postMessage = postMessage;
            const _addEventListener = addEventListener;

            ((obj) => {
              let current = obj;
              const keepProperties = [
                'Object', 'Function', 'Infinity', 'NaN', 'undefined',
                'caches', 'TEMPORARY', 'PERSISTENT',
                'Array', 'Boolean', 'Number', 'String', 'Symbol',
                'Map', 'Math', 'Set', 'JSON', 'console',
              ];

              do {
                Object.getOwnPropertyNames(current).forEach((name) => {
                  if (name === 'console') {
                    current.console = {
                      log: (...args: any[]) => {
                        messages.push({ type: 'log', data: JSON.stringify(Array.from(args)) });
                      },
                      error: (...args: any[]) => {
                        messages.push({ type: 'error', data: JSON.stringify(Array.from(args)) });
                      },
                    };
                  }
                  if (keepProperties.indexOf(name) === -1) {
                    delete current[name];
                  }
                });
                current = Object.getPrototypeOf(current);
              } while (current !== Object.prototype);
              // @ts-expect-error - self is not defined
            })(this);

            _addEventListener('message', (e) => {
              new Function('', `{${e.data}\n};`)();
              _postMessage(JSON.stringify(messages));
            });
          }.toString(),
          ')()',
        ],
        { type: 'application/javascript' },
      ),
    );

    const worker = new Worker(blobURL);
    URL.revokeObjectURL(blobURL);

    worker.onmessage = (evt) => {
      worker.terminate();
      resolve(JSON.parse(evt.data));
    };

    worker.onerror = (evt) => {
      reject(new Error(evt.message));
    };

    worker.postMessage(untrustedCode);

    setTimeout(() => {
      worker.terminate();
      reject(new Error('The worker timed out.'));
    }, 2000);
  });
}
```

## 피드백을 바탕으로 한 추가 개선 과정

1차적인 기능을 바탕으로 베타 버전을 배포해 내부 구성원 분들에게 피드백을 요청드렸고, 감사하게도 많은 피드백을 주셔서 추가 기능들을 구현하게 되었어요.

### .docs, .pdf, .xls 등 다양한 파일 지원 추가

이미지 파일을 제외한 다양한 문서 파일들에 대한 지원을 원하는 분들이 많았어요. 특히 사업팀에서는 `.xls, .csv, .pdf, .txt`에 해당하는 다양한 확장자의 문서 파일들을 첨부해 서비스를 사용하는 경우가 많아 해당 기능에 대한 수요가 높았습니다.

문제는 Azure OpenAI API에서는 이미지를 제외한 파일 첨부 기능을 지원하지 않는다는 점이었는데요, ChatGPT 등 서비스 레이어에서는 파일에 대한 파싱 기능을 지원했지만, API에서는 image [MIME 타입](https://developer.mozilla.org/ko/docs/Web/HTTP/MIME_types)에 해당하는 파일의 인식만 지원했어요.

이 문제를 해결하기 위해 첨부된 파일의 MIME 타입에 따라 text 형태의 메시지로 컨버팅을 해주는 레이어를 추가하고, [PDF.js](https://mozilla.github.io/pdf.js/), [officeparser](https://www.npmjs.com/package/officeparser) 등의 라이브러리를 사용했어요.

```ts
const getContentByMimeType = async () => {
  switch (content.mimeType) {
    case 'application/pdf':
      return pdfToText(url);
    case 'text/csv':
    case 'text/plain':
    case 'text/html':
      return fetchAsText(url);
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return officeToText(url);
    default:
      return 'Unsupported file type';
  }
};
```

이를 통해 `.pdf, .doc, .docx, .xls, .xlsx, .txt, .csv, .html` 파일에 대한 인식을 지원할 수 있었어요.

### 그 밖에 추가된 도구들

챗봇을 사용하다보니 LLM 자체의 한계로 인한 추가 도구 구현의 필요성이 느껴졌어요.

### 계산기

쉽게 구현하면서 효과도 좋았던 기능은 바로 계산기였어요. 복잡한 계산이나 수식이 아닌 단순 사칙연산을 지원하는 기능을 구현했는데요, 수학을 잘 못하는 LLM의 특성상 계산기를 사용해서 환각을 억제하고 정확한 값을 얻을 수 있었습니다.

```ts
calculator: {
  description: 'Use calculator for accurate calculation',
  parameters: z.object({
    operator: z
      .enum(['+', '-', '*', '/'])
      .describe('The operator to use for calculation'),
    numbers: z.array(z.number()).describe('Array of numbers to calculate'),
  }),
  execute: async ({ operator, numbers }) => {
    const [firstNumber, ...restNumbers] = numbers as number[];
    const result = restNumbers.reduce((acc, cur) => {
      switch (operator) {
        case '+': return acc + cur;
        case '-': return acc - cur;
        case '*': return acc * cur;
        case '/': return acc / cur;
        default: return acc;
      }
    }, firstNumber);
    return `${numbers.join(` ${operator} `)} = ${result}`;
  },
},
```

### 웹 접근 기능 구현

웹 접근 기능은 말그대로 URL 등을 사용한 웹 문서를 읽는 기능이에요. LLM의 한계인 실시간 데이터에 대한 접근을 가능하게 해주는 유용한 기능인데요, html을 얻기 위해 해당 url에 대한 fetch로 구현을 하는 간단한 방법도 있겠지만, javascript 실행이 필수적인 SPA(Single Page Application)등 다양한 환경에 대한 지원을 위해 [puppeteer](https://pptr.dev/)를 사용했습니다.

sanitize기능 구현을 위해 [dompurify](https://www.npmjs.com/package/dompurify) + [JSDOM](https://www.npmjs.com/package/jsdom) 을 사용하였으며,

```ts
function cleanHTML(dirty: string) {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: [
      //...
    ],
    ALLOWED_ATTR: ['href', 'title', 'alt'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_SELF_CLOSE_IN_ATTR: false,
  });
}
```

토큰 절약을 위한 html → markdown 변환에는 [node-html-markdown](https://www.npmjs.com/package/node-html-markdown) 을 사용했습니다.

위 프로세스를 통해 LLM이 해당 웹 페이지의 내용을 효과적으로 인식할 수 있게 되었어요.

### Puppeteer 설정 과정에서의 트러블 슈팅

로컬에서 puppeteer를 사용하며 테스트를 할 때는 좋았는데… 배포를 해보니 chrome이 설치되지 않아 에러가 발생하고 있었습니다. 이를 해결하기 위해 도커 환경에서 동작하는 크롬 설치가 필요했어요.

puppeteer의 도커 문서에는 docker 환경에 puppeteer 세팅이 된 이미지가 제공되고 있었으나, 기존 도커 이미지에 크롬만 추가적으로 설치하기 위해 다음 레퍼런스를 참고해서 도커 이미지를 수정했어요.

```dockerfile
# 베이스 이미지 설정
FROM node:22.6
# COREPACK 활성화
RUN corepack enable

# 작업 디렉토리 설정
WORKDIR /app

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install Google Chrome Stable and fonts
RUN apt-get update && apt-get install curl gnupg -y
RUN curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
RUN apt-get update
RUN apt-get install google-chrome-stable -y --no-install-recommends
RUN rm -rf /var/lib/apt/lists/*

COPY . .

ENTRYPOINT ["pnpm", "start"]
```

그리고 도커 환경에 설치된 chrome의 정확한 위치를 puppeteer에 전달하기 위해 [locate-chrome](https://www.npmjs.com/package/locate-chrome)을 사용했습니다.

```ts
async function preparePuppeteer() {
  if (puppeteer.current?.connected) {
    return;
  }
  await puppeteer.current?.close();
  puppeteer.current = null;

  const executablePath: string =
    (await new Promise((resolve) => locateChrome(resolve))) || '/usr/bin/google-chrome';

  puppeteer.current = await launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}
```

## 배포

마지막으로 배포 과정에서 고민했던 부분들과 이슈는 다음과 같아요.

일단 기존 vercel 템플릿 백엔드 설정인 PostgreSQL + drizzle은 그대로 유지했습니다. drizzle의 개발 경험이 괜찮았고 기존 설정에서 크게 바꿀만한 부분이 보이지 않았습니다.

### 데이터베이스

### Neondb를 통한 PostgreSQL 사용

빠른 프로덕트 검증을 위해 PostgreSQL은 프리티어를 제공하는 서버리스 DB 호스팅 서비스인 NeonDB를 사용해서 구축했어요.

배포 후 설정까지 10분이 채 되지 않을 정도로 빠르게 설정되어 매우 만족도가 높았으나, 프리티어의 특성상 용량과 컴퓨팅 시간의 제한이 있어 무료 크레딧이 많이 남아있는 Azure로 이관하기로 결정했어요.

### Azure PostgreSQL로의 이관

Azure에서의 PostgreSQL 사용을 위해 리소스를 찾아보았는데, 이름이 조금씩 다른 여러 리소스가 나와서 고르는 데에 어려움이 있었어요.

o1 모델에게 물어보니 Flexible Server를 고르라고 이야기를 해줬어요. 근거를 물어보니 납득이 가 o1 모델이 시키는 대로 배포를 한 후, Neon에서 Azure로 DB를 옮겨줬어요.

이미 서비스가 배포되어 구성원분들이 사용중이기 때문에 DB의 내용도 마이그레이션을 해야했는데요, Azure에서 외부 DB의 내용을 가져오는 기능이 제대로 동작하지 않아 pg_dump, pg_restore 명령어를 사용해 직접 옮겨주었어요.

### 프론트엔드 배포

### Cloudflare Worker

Next.js 위에서 구축된 서비스의 특성상 vercel에서 배포하는 것이 가장 편리한 방법이었어요. 하지만 기존 크리에이트립에서 사용중인 인프라 환경에서 구축하고 싶은 마음이 있어 Cloudflare 혹은 AWS에서의 배포를 시도하게 됩니다.

먼저 [Cloudflare의 공식문서](https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs/)를 참고하여 배포를 시도했는데요, Next의 node.js 런타임을 Cloudflare Worker의 환경에서 돌릴 수 있게 하는 [opennextjs](https://opennext.js.org/cloudflare) 프로젝트에 의존하는 방식이었어요.

그러나 1.0 이전의 실험적인 지원이라서 그런지 빌드 후 동작하는 Worker 런타임에서 이유를 알 수 없는 버그가 많이 발생했어요. 그리고 로컬 개발 환경과 실제 배포 환경이 다르다는 것도 매우 불편했습니다. 더군다나 chrome browser를 띄우는 무거운 작업을 워커에서 문제없이 돌릴 수 있을지에 대한 의문이 많아 AWS Amplify를 시도하게 됩니다.

### AWS Amplify -> ECS

AWS Amplify의 배포 프로세스가 매우 편리하다는 것은 익히 알고 있어 빠르게 설정 후 배포까지 성공할 수 있었어요.

하지만 LLM 챗봇의 특성상 치명적인 문제가 있었는데요, 대부분의 LLM 서비스는 스트리밍 응답을 지원하고 이를 위해 [SSE(Server-sent Event)](https://developer.mozilla.org/ko/docs/Web/API/Server-sent_events)기술에 의존해요. 그런데 AWS Amplify에서는 SSE를 지원하지 않아 채팅이 스트리밍 형식으로 제공되지 않는 치명적인 문제가 있었습니다.

결국 유저페이지를 배포하는 방식과 동일하게 ECS를 통해 배포했어요.

## 맺으며

### 지속적인 개선

이후에도 사내 구성원 분들의 피드백과 요청사항을 바탕으로 다양한 추가 기능들이 업데이트 되었어요.

**메모리 기능 ([Mem0.ai](https://mem0.ai/) 오픈소스 셀프 호스팅)** — 대화 내용을 바탕으로 사용자 맞춤 기억을 점점 쌓아가고, 질문에 필요한 기억을 가져와서 응답할 수 있습니다.

**시각화 기능(like claude)** — 7~8번 정도 티키타카를 하면서 간단한 게임이나 UI를 만들고 preview 기능을 통해 바로 확인할 수 있습니다.

### 프로젝트 성과 및 배운 점

- 출시 후 한 달간 구성원 56분이 사내 AI 챗봇 서비스를 사용, 총 600개가 넘는 채팅 세션과 15000개가 넘는 메시지가 생성되었어요.
- CX, 신사업, 제휴 등 여러 팀에서 기존 ChatGPT 유료 구독을 자체 서비스로 대체하여 구독 비용이 절감되었어요.
- 개인적으로는 GraphQL 오퍼레이션을 찾는 기능을 알차게 잘 사용하고 있으며 공식문서 등 영문 페이지들의 링크를 던지고 요약해서 학습하는 루틴이 아주 쏠쏠했어요.

개인적으로는 보일러 플레이트를 찾고 서비스 하나를 구축하는데 생각보다 리소스가 많이 소모되지 않아 가성비가 좋았던 점이 아주 만족스러웠어요. 뭔가를 만들기 시작할 때 괜찮은 보일러 플레이트나 템플릿이 있으면 적극적으로 사용하는게 좋다는 점도 새삼 체감한 것 같아요.

이 글을 읽는 여러분들도 이번 주말이나 연휴에 LLM을 사용한 재미있는 서비스를 만들어보시는게 어떨까요?

긴 글 읽어주셔서 감사합니다.
