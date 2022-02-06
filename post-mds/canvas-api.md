---
title: Canvas api
date: 2022-02-06
tags: canvas
---

# Canvas api란?

Canvas API는 javascript와 Html `canvas` 엘리먼트를 통해 그래픽을 그릴 수 있는 수단을 제공하는 api로, html5의 구성요소입니다. 애니메이션과 게임 그래픽, 데이터 시각화, 사진 조작 및 비디오 등의 다양한 분야에서 사용되고 있습니다.

주로 2D 그래픽을 다루는 데 사용되고 있으며, 비슷하게 그래픽을 다루는 API 중에선 3D를 주로 다루는 WebGL이 있습니다.

## WebGL이란?

> **WebGL**(Web Graphics Library)은 플러그인을 사용하지 않고 웹 브라우저에서 상호작용 가능한 3D와 2D 그래픽을 표현하기 위한 JavaScript API입니다. WebGL은 HTML5 [canvas](https://developer.mozilla.org/ko/docs/Web/HTML/Element/canvas) 요소에서 사용할 수 있는, OpenGL ES 2.0을 대부분 충족하는 API를 제공합니다.
*-MDN*

## Canvas API 와 WebGL 차이

| 차이점 | Canvas API | WebGL(Web Graphics Library) |
| --- | --- | --- |
| 탄생 계기 | Apple의 Webkit에 처음 도입되어 Mac OS X 대시보드(Dashboard)에 사용되었고, 이후 다른 브라우저에도 구현 | 원본 작성자는 Mozilla Foundations. 그러나 개발은 Kronos WebGL 워킹그룹 주도로 진행 |
| 시작 | 2004년 | 2011년 |
| 관계 | WebGL의 전신 | Canvas 3D 실험을 통해 발전됨 |
| 선호 | 일반적으로 2D 렌더링에 선호 | 2D도 가능하지만 3D에서 더 선호 |
| 속도 | 보통(Canvas API 기준) | 빠름(Canvas API 기준) |
| 기능 | 보통(Canvas API 기준) | 많음(셰이더 지원) |
| 러닝커브 | 낮음(최소한의 수학지식 필요) | 높음(높은 수학지식 및 렌더링 파이프라인에 대한 이해 필요) |

라이브러리를 사용하지 않고 제로베이스에서 사용하는 데에는 Canvas API가 더 배우고 이해하기 쉽다고 합니다. 그 이유는 최소한(?)의 수학 지식만이 필요하고 개발이 빠르고 간단하기 때문입니다. WebGL 로 작업을 하려면 상대적으로 수학에 대한 더 많은 지식과 렌더링 파이프라인에 대한 이해가 필요합니다.

- 렌더링 파이프라인(OpenGL Pipeline)이란?

  대략적인 절차는 다음과 같습니다.
  `좌표 배열 → 꼭짓점 설정 → 레스터화 → 출력`

  ![](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163032990Z_Untitled.png)


두 API 모두 html5 기반으로, 일반적인 상황에서는 어느 하나를 지원하는 브라우저/장치는 나머지 하나도 무리없이 지원합니다.

Canvas와 WebGL 모두 Javascirp API이며, 지원 환경이 거의 일치하는 모습을 볼 수 있습니다.

![](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163111632Z_스크린샷_2022-01-14_오후_2.27.12.png)

- basic support가 아닌 추가기능들은 호환성을 보고 사용해야 할 듯... IE...

![스크린샷_2022-01-14_오후_2.29.21.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163146271Z_스크린샷_2022-01-14_오후_2.29.21.png)
![스크린샷_2022-01-14_오후_2.27.30.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163213952Z_스크린샷_2022-01-14_오후_2.27.30.png)

- `Canvas API vs WebGl vs Three.js 기능 차이 및 호출 메소드 차이`
  ![Untitled 1.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163307520Z_Untitled%201.png)


### WebGL이 Canvas API보다 빠른 이유?

처음에 언뜻 봤을 땐 Canvas API가 더 저 수준(?)의 API이고, WebGL이 Canvas API를 활용해 추가적인 편의 기능을 붙인 줄 알았습니다. 때문에 기능이 추가된 WebGL이 더 빠르다는 이야기를 듣고 좀 혼란이 왔는데, 조금 더 자세히 살펴보니 완전히 잘못 이해하고 있었습니다.

**둘의 성능 차이는 어디에서 나는 것일까요?**

결론부터 말하자면, Canvas API는 내부 구현에 있어서는 WebGL과 동일한 방식으로 작동합니다.

또한 WebGL은 Canvas API에서는 최적화 할 수 없는 부분까지 최적화가 가능합니다.

### 예시

속이 꽉 찬 원을 그리는 코드를 예시로 살펴봅시다.

Canvas API를 사용한 코드는 다음과 같습니다.

```jsx

ctx.beginPath();
ctx.arc(x좌표, y좌표, 반지름, '시작 각도', 2 * Math.PI('종료 각도'));
ctx.fill();
```

**이제 실제로는 어떤 일이 일어날까요?**

1. `beginPath` 경로(path)를 생성합니다. (버퍼 생성)
2. `arc` 원 혹은 호를 그리기 위해 반지름의 크기만큼 버퍼 영역을 확보합니다. 이 때, Canvas API는 해당 영역에 `fill` , `stroke` 중 어떤 것이 호출될지 모르기 때문에 버퍼 영역을 일단 충분히 확보합니다.
3. `fill` 이 호출되면 해당 버퍼 영역에 drawArray 혹은 drawElements를 호출해서 색을 칠합니다.

**두 번째 원을 그릴 때?** 역시 마찬가지로 위와 같은 작업을 **동일하게** 반복합니다.

천 번 만 번 반복을 하더라도 위와 같은 작업은 동일하게 필요합니다.

**WebGL에서는 어떤 부분이 최적화가 가능할까요?**

- WebGL code

    ```jsx
    const m4 = twgl.m4;
    const gl = document.querySelector('canvas').getContext('webgl');
    const vs = `
    attribute vec4 position;
    uniform mat4 u_matrix;
    
    void main() {
      gl_Position = u_matrix * position;
    }
    `;
    
    const fs = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
      gl_FragColor = u_color;
    }
    `;
    
    const program = twgl.createProgram(gl, [vs, fs]);
    const positionLoc = gl.getAttribLocation(program, 'position');
    const colorLoc = gl.getUniformLocation(program, 'u_color');
    const matrixLoc = gl.getUniformLocation(program, 'u_matrix');
    
    const positions = [];
    const radius = 50;
    const numEdgePoints = 64;
    for (let i = 0; i < numEdgePoints; ++i) {
      const angle0 = (i    ) * Math.PI * 2 / numEdgePoints;
      const angle1 = (i + 1) * Math.PI * 2 / numEdgePoints;
      // make a triangle
      positions.push(
        0, 0,
        Math.cos(angle0) * radius,
        Math.sin(angle0) * radius,
        Math.cos(angle1) * radius,
        Math.sin(angle1) * radius,
      );
    }
    
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
                     
    gl.useProgram(program);
                     
    const projection = m4.ortho(0, gl.canvas.width, 0, gl.canvas.height, -1, 1);
    
    function drawCircle(x, y, color) {
      const mat = m4.translate(projection, [x, y, 0]);
      gl.uniform4fv(colorLoc, color);
      gl.uniformMatrix4fv(matrixLoc, false, mat);
    
      gl.drawArrays(gl.TRIANGLES, 0, numEdgePoints * 3);
    }
    
    drawCircle( 50, 75, [1, 0, 0, 1]);
    drawCircle(150, 75, [0, 1, 0, 1]);
    drawCircle(250, 75, [0, 0, 1, 1]);
    ```


쉽게 말하면, WebGL에서는 일종의 인스턴스화를 통해 이미 원을 그려놓거나, 원을 그리는데 필요한 반복 작업들(원의 크기를 계산하고 그 안을 채우고 버퍼 영역을 확보하는 등의 일)을 캐싱할 수 있습니다. (셰이더에 대한 이해가 부족해서 저는 이렇게 이해하고 넘어갔습니다 ㅠㅠ)

### 그럼 Canvas API 에서는 왜 캐싱을 안 할까?

그 이유는 Canvas API에서 도형을 모양을 정하고 윤곽을 잡는데 사용되는 호출 함수와, 실제로 그 내부를 채우는 함수가 다르기 때문입니다.

만약 `arc` 를 호출해서 호를 그렸다고 해도, 그 다음에 사용자가 다음 포인트로 이동을 할 지 `moveTo` , 다른 포인트로 이동하면서 해당 면적을 채울지 `lineTo` , 그 안을 채울지 `fill`, 외곽선을 그릴지 `stroke` 알 수 없기 때문입니다.

<aside>
💡 path2D 등의 객체를 사용해서 일부 path에 대해 재사용 가능하도록 하는 기능이 있긴 합니다. 그러나 위 문제에 대한 근본적인 해결책이라고 보긴 어렵습니다. 
(path. 즉, 경로만을 재사용하기 때문)

</aside>

### 뭐가 더 좋은 것일까?

요점은 WebGL이 Canvas API가 스킵할 수 없는 일부 단계를 스킵하거나, 재사용이 가능하게끔 더 낮은 레벨에서 제어할 수 있다는 점입니다.

그러나 위에서 본 바와 같이, Canvas API는 원을 그리는 데 3줄이 필요한 반면 WebGL은 원을 그리는데 60줄의 코드가 필요합니다.

**따라서 WebGL / Canvas API는 편의성과 성능의 tradeoff가 있고, 상황에 맞게 사용을 하면 된다고 보면 되겠습니다.**

# Canvas API 는 쉽다

간단한 무언가를 만들기에, 또 당장 시작하기에는 Canvas API가 적합합니다.

## 일단 그려보자

### 도화지 만들기

Canvas API는 Canvas Element가 있어야 하기 때문에, Canvas Element를 하나 넣어준 html 파일을 만들어줍니다.

```jsx
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<title>GAME</title>
</head>
<body>
	<canvas></canvas>
</body>
</html>
```

<aside>
💡 높이와 너비를 설정하지 않은 canvas의 크기는 기본적으로 w:300px h:150px 입니다.

</aside>

### 컨텍스트 가져오기

캔버스 위에 무엇인가 그리기 위해서는 다음과 같이 드로잉 컨텍스트를 가져와야 합니다.

[HTMLCanvasElement.getContext() - Web API | MDN](https://developer.mozilla.org/ko/docs/Web/API/HTMLCanvasElement/getContext)

```jsx
const contextType = "2d" 
// "2d" | "webgl" | "webgl2" | "bitmaprenderer"

const canvas = document.querySelector('canvas')
const ctx = canvas.getContext(contextType);
```

드로잉 컨텍스트 중, 우리는 2차원 렌더링 컨텍스트를 나타내는 CanvasRenderingContext2D 객체를 사용합니다. 이 객체가 위에서 WebGL과 비교에 사용했던 Canvas API라고 이해하면 됩니다.

### 그리기

이제 이 드로잉 컨텍스트의 다양한 메소드를 통해 캔버스에 도형 등을 그릴 수 있습니다. 대표적으로 자주 사용되는  메소드들은 다음과 같습니다.

1. `beginPath` 새 경로(path)를 생성합니다.
    1. 경로란? 경로는 점들의 집합이며, 선의 한 부분으로 연결되어 여러가지 도형, 곡선을 이루고 두께와 색을 나타내는 역할을 합니다.
    2. 말 그대로 새 경로 생성(이전 경로와의 연결을 끊음)이기 때문에 최초에는 호출하지 않아도 됩니다. 최초의 경로(path) 하나는 이미 존재하기 때문입니다.
2. `closePath` 경로 닫기. 마지막 경로에 있는 점과 경로의 시작점을 연결합니다.
3. `stroke` 경로의 윤곽선에 선을 그립니다.
4. `fill` 경로의 내부를 채웁니다.
5. `moveTo` 아무것도 그리지 않고 펜(현재 위치)의 좌표를 옮깁니다.
6. `lineTo` 현재 위치에서 특정 위치까지의 직선을 그립니다.
7. `arc` 호/원을 그립니다.
8. `rect` 직사각형을 그립니다.

원과 정사각형을 그려봅시다.

```jsx
ctx.rect(5, 5, 40, 40) // x, y, w, h
ctx.arc(100, 15, 20, 0, 2*Math.PI) // x, y, r, 시작 각, 끝 각
ctx.stroke();
```

![스크린샷_2022-01-16_오후_3.39.19.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163340820Z_스크린샷_2022-01-16_오후_3.39.19.png)

윽... 너무 흐리고 선이 연결되어 이상하네요. 뭐가 문제일까요?

**흐린 문제**는 레티나 디스플레이와 같은 고해상도 디스플레이에서의 추가 픽셀이 필요해서 나타나는 현상으로, window 객체에 있는 **devicePixelRatio**를 통해 교정할 수 있습니다.

![Untitled 2.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163356673Z_Untitled%202.png)

![스크린샷_2022-01-18_오전_12.05.40.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163421837Z_스크린샷_2022-01-18_오전_12.05.40.png)

```jsx
const scale = window.devicePixelRatio;
ctx.scale(scale, scale);
canvas.width = 300 * scale;
canvas.height = 150 * scale;
canvas.style.width = 300 + "px";
canvas.style.height = 150 + "px";
```

![스크린샷_2022-01-16_오후_3.39.38.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163454699Z_스크린샷_2022-01-16_오후_3.39.38.png)

**선이 연결된 문제**는 생각해보면 간단한데, 해당 코드가 그림을 그리는 과정이라고 생각한다면 **붓을 떼지 않고 원**을 그리러 간 셈이기 때문입니다. `moveTo` 를 통해 붓의 위치를 원으로 옮겨봅시다.

```jsx
ctx.rect(5, 5, 40, 40);
ctx.moveTo(100,25); // 붓의 위치를 옮긴다.
ctx.arc(100, 25, 20, 0, 2*Math.PI);
```

![스크린샷_2022-01-16_오후_3.41.51.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163512931Z_스크린샷_2022-01-16_오후_3.41.51.png)

...이렇게 수정해 나가면서 x 좌표에 원의 반지름을 더해도 되겠지만, 더 쉬운 방법이 있습니다.

바로 다음과 같이 코드를 수정하는 것입니다.

```jsx
ctx.rect(5, 5, 40, 40);
ctx.stroke();

ctx.beginPath();
ctx.arc(100, 25, 20, 0, 2*Math.PI);
ctx.stroke();
```

1. 정사각형을 정의하고, 외곽선을 그린다.
2. 새 경로를 생성한다. 새 경로 위에서 원을 정의하고, 외곽선을 그린다.

![스크린샷_2022-01-16_오후_3.45.15.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163526935Z_스크린샷_2022-01-16_오후_3.45.15.png)

`beginPath`를 사용해서 새 경로를 만드는 방법은 각 경로의 스타일을 격리시켜 관리 할 때에도 유용하게 사용됩니다.

```jsx
ctx.fillStyle = "#111111";
ctx.rect(5, 5, 40, 40);
ctx.fill();

ctx.beginPath();
// 이전 경로와의 단절을 통해 다른 fillStyle을 적용시킬 수 있다.
ctx.fillStyle = "red";
ctx.arc(100, 25, 20, 0, 2 * Math.PI);
ctx.fill();
```

만약 중간에 `beginPath` 를 넣어주지 않았다면, 마지막에 선언한 `fillStyle` 이 하나의 path에 적용되게 됩니다.

![스크린샷_2022-01-18_오전_12.08.50.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163602185Z_스크린샷_2022-01-18_오전_12.08.50.png)

beginPath() 를 중간에 넣지 않았을 때

![스크린샷_2022-01-16_오후_3.48.13.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163612558Z_스크린샷_2022-01-16_오후_3.48.13.png)

beginPath() 를 중간에 넣었을 때

# 뭔가 만들어보자

개인적으로는 뭔가 만들어보면서 익히는 성격이라 다짜고자 만들어 보기로 했습니다.

## 피하기 게임 만들기

네모와 동그라미를 만들 수 있다면 이제 게임을 만들 수 있습니다(?)

예전에 많이 했던 xx피하기 류 게임을 만들어보려고 합니다.

### 게임판 만들기

먼저 게임판(canvas)을 500*500 사이즈로 만들어줍니다.

```jsx
const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d');

const scale = window.devicePixelRatio;
ctx.scale(scale, scale);
const canvasWidth = 500;
const canvasHeight = 500;
canvas.width = canvasWidth * scale;
canvas.height = canvasHeight * scale;
canvas.style.width = canvasWidth + "px";
canvas.style.height = canvasHeight + "px";
```

### 유저 캐릭터 만들기

Player라는 클래스를 하나 만들어줍니다. 유저 캐릭터는 위에서 만든 네모난 정사각형으로 하겠습니다.

게임 시작시 정 가운데에서 시작했으면 좋겠으니 생성자에서 캔버스 크기를 받아와 위치를 초기화 해줍니다.

```jsx
class Player {
	xPos; yPos; size;
	color = "rgba(22,22,22,0.9)"

	constructor(canvasWidth, canvasHeight, size = 40){
		this.xPos = Math.round(canvasWidth / 2) - size / 2;
		this.yPos = Math.round(canvasHeight / 2) - size / 2;
		this.size = size;
	}

	drawPlayerRect(ctx){
		ctx.beginPath();
		ctx.fillStyle = this.color
		ctx.rect(this.xPos, this.yPos, this.size, this.size);
		ctx.fill();
	}

}

const user = new Player(canvasWidth, canvasHeight);
user.drawPlayerRect(ctx);
```

![스크린샷_2022-01-16_오후_4.11.37.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163627619Z_스크린샷_2022-01-16_오후_4.11.37.png)

가운데 정사각형이 생겼는데, 이게 정 가운데인지 감이 좀 안 오기 때문에, 확실히 하기 위해 임시로 캔버스에 격자를 추가해서 작업하도록 하겠습니다.

```jsx
// 대충 10칸짜리 격자로 줄 긋겠다는 코드
function drawGrid(gridNumber = 10){
	ctx.beginPath();
	for (let index = 0; index <= gridNumber; index++) {
		ctx.moveTo(index * (canvasHeight/gridNumber), 0);
		ctx.lineTo(index * (canvasHeight/gridNumber), canvasHeight);
		ctx.moveTo(0, index * (canvasWidth/gridNumber));
		ctx.lineTo(canvasWidth, index * (canvasWidth/gridNumber));
	}
	ctx.strokeStyle = "red"
	ctx.stroke();
}
```

![스크린샷_2022-01-16_오후_4.13.26.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163645555Z_스크린샷_2022-01-16_오후_4.13.26.png)

이제 확실히 정 가운데인게 티가 나는 것 같습니다.

### 폭탄 만들기

그냥 빨간 공이라고 하면 안 위험해 보이니까 폭탄이라고 하겠습니다.

폭탄은 빨간색 원을 그려서 간단히 만들 수 있습니다.

긴장감을 주기 위해 폭탄의 출발 위치는 게임판의 네 모서리 중 무작위로 한 곳으로 설정해줍니다.

```jsx
class Bomb {
	xPos; yPos; size;
	color = "rgba(244,22,22,0.9)"

	constructor(canvasWidth, canvasHeight, size = 10){
		this.xPos = randomItemInArray([0,500]);
		this.yPos = randomItemInArray([0,500]);
		console.log(this.xPos)
		this.size = size;
	}

	drawBomb(ctx){
		ctx.beginPath();
		ctx.fillStyle = this.color
		ctx.arc(this.xPos, this.yPos, this.size, 0, Math.PI * 2);
		ctx.fill()
	}
}

// 랜덤하게 꺼내오는 유틸 함수
function randomItemInArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
```

<video controls width="100%">
    <source src="https://d3mjjrvt1qsw2m.cloudfront.net/Canvas api_20220206T064949995Z_1.mov">
</video>

새로고침에 따라 빨간 원의 시작점이 달라지는 모습

### 폭탄 움직이게 만들기 (애니메이션 추가)

폭탄이 안 움직이면 재미가 없으니 폭탄을 알아서 움직이게 해줍니다.

애니메이션을 날로 먹기 위해 `window.requestAnimationFrame()`을 사용합니다.

[window.requestAnimationFrame() - Web API | MDN](https://developer.mozilla.org/ko/docs/Web/API/Window/requestAnimationFrame)

`window.requestAnimationFrame()`는 콜백함수를 인자로 받아 모니터 주사율에 맞춰 초당 호출을 해주는 함수입니다. 보통은 60fps를 위해 1초에 60번 호출됩니다. 최신 브라우저에서는 성능과 배터리 향상을 위해 백그라운드 상태에서는 실행을 중단해주는 기특한 기능도 가지고 있습니다.

이제 폭탄에 속도를 위한 vector를 선언해주고, requestAnimationFrame을 이용해 애니메이션을 실행시켜보도록 하겠습니다.

```jsx

class Bomb {
	xPos; yPos; size; xVector; yVector;
	color = "rgba(244,22,22,0.9)"

	constructor(canvasWidth, canvasHeight, size = 10, vector = 1){
		this.xPos = randomItemInArray([0,500]);
		this.yPos = randomItemInArray([0,500]);
		this.size = size;
		this.xVector = vector;
		this.yVector = vector;
	}

	drawBomb(ctx){
		ctx.beginPath();
		ctx.fillStyle = this.color
		ctx.arc(this.xPos, this.yPos, this.size, 0, Math.PI * 2);
		ctx.fill()
	}
}

//

let drawAnimation;

function drawGame(){
	ctx.clearRect(0, 0, canvasWidth, canvasHeight);
	drawGrid();

	user.drawPlayerRect(ctx);
	bomb.xPos = bomb.xPos + bomb.xVector
	bomb.yPos = bomb.yPos + bomb.yVector
	bomb.drawBomb(ctx)
	drawAnimation = window.requestAnimationFrame(drawGame);
}

drawGame();
```

<video width="100%" src="https://d3mjjrvt1qsw2m.cloudfront.net/Canvas api_20220206T065020944Z_2.mov"></video>

### 화면 안에 가두기

공이 잘 움직이는건 좋았는데, 좌표가 계속 더해지다보니 화면 바깥으로 쭉 나가버립니다.

이 문제를 해결하기 위해 canvas 를 벗어나는 좌표에서는 vector를 반대 방향으로 바꿔주면 될 것 같습니다. 이제 테두리를 넘는 일은 없을겁니다.

```jsx

class Bomb {
	// ...

	checkFrame(){
		if(this.xPos > canvasWidth){
			this.xPos = canvasWidth;
			this.#changeDirectionX();
		}
		if(this.xPos < 0){
			this.xPos = 0;
			this.#changeDirectionX();
		}
		if(this.yPos > canvasHeight){
			this.yPos = canvasHeight;
			this.#changeDirectionY()
		}
		if(this.yPos < 0){
			this.yPos = 0;
			this.#changeDirectionY()
		}
	}

	#changeDirectionX(){
		bomb.xVector = -bomb.xVector
	}

	#changeDirectionY(){
		bomb.yVector = -bomb.yVector
	}
}

function drawGame(){
	// ...
	bomb.xPos += bomb.xVector
	bomb.yPos += bomb.yVector
	bomb.checkFrame();
	// ...
}

drawGame();
```

<video width="100%" src="https://d3mjjrvt1qsw2m.cloudfront.net/Canvas api_20220206T065100425Z_3.mov"></video>

### 랜덤요소 추가

이제 폭탄이 바깥으로 안 나가긴 하는데, 정해진 경로만 움직이니 재미가 없습니다...ㅠ

폭탄 속도에 랜덤 요소를 좀 넣고, 최대 최소 속도를 제한해 줍니다.

```tsx

class Bomb {
    //...
    #changeDirectionX(){
        this.xVector = -(this.xVector) * (1.5 - Math.random());
        this.xVector = Math.abs(this.xVector) < this.minVector ? this.minVector : this.xVector;
        this.xVector = Math.abs(this.xVector) > this.maxVentor ? this.maxVentor : this.xVector;
    };

    #changeDirectionY(){
        this.yVector = -(this.yVector) * (1.5 - Math.random());
        this.yVector = Math.abs(this.yVector) < this.minVector ? this.minVector : this.yVector
        this.yVector = Math.abs(this.yVector) > this.maxVentor ? this.maxVentor : this.yVector
    };
}
```

<video width="100%" src="https://d3mjjrvt1qsw2m.cloudfront.net/Canvas api_20220206T065107207Z_4.mov"></video>

이제 뭔가 좀 게임같은 느낌이 들기 시작합니다.

### 마우스로 이동하기

이제 조작을 통해 유저를 움직일 수 있게 만들어봅시다.

가장 간단한 mousemove 이벤트를 통해 움직여야 하는 마우스 위치의 좌표를  얻을 수 있습니다.

```jsx

canvas.addEventListener('mousemove', (e)=>{
	user.xPos = e.clientX;
	user.yPos = e.clientY;
}); 
```

### 게임 종료 조건 추가 (충돌감지)

user가 폭탄을 만났을 때(겹쳤을 때) 게임이 종료되는 처리도 간단하니 함께 하려고 합니다.

폭탄에 유저와의 충돌 감지를 하는 checkCollision 함수를 만들고, 매 프레임마다 충돌 체크 후 게임 오버를 해줍니다.

<aside>
💡 엄밀히 하자면 폭탄의 반지름만큼 좌표 보정을 해줘야 하는데, 여기선 그냥 폭탄의 중심 좌표를 기준으로 user의 크기만 고려하였습니다.

</aside>

```jsx
class Bomb{
    //...
    checkCollision(user){
        const xCollision = this.xPos > user.xPos && this.xPos < user.xPos+size;
        const yCollision = this.yPos > user.yPos && this.yPos < user.yPos+size;
        return xCollision && yCollision;
    };
}


//...
function drawGame(){
    //...
    if(bomb.checkCollision(user)){
        window.cancelAnimationFrame(drawGame);
        return alert("Game over");
    };
};
```

<video width="100%" src="https://d3mjjrvt1qsw2m.cloudfront.net/Canvas api_20220206T065114698Z_5.mov"></video>

## 좀 더 재밌게 버무려보자

완성은 됐는데 재미가 전혀 없습니다.

몇 가지 요소를 추가해서 재미를 더해보도록 하겠습니다.

1. 점수 추가 (살아남은 시간)
2. 시간에 따라 폭탄 갯수 추가
3. 폭탄과 유저에 잔상 추가

### 점수 추가

캔버스 상단에 유저가 몇 초 살아남았는지 표시해주고, 게임 오버시 알려주도록 합니다.

GameTimer 클래스를 하나 만들어서 시간을 표시해주도록 했습니다.

```jsx
class GameTimer {
	startTime;
	playTime;

	constructor(startTime){
		this.startTime = startTime;
	}

	drawTime(){
		this.#updateTime();
		ctx.beginPath();
		ctx.font = '24px serif';
		ctx.fillStyle = "black";
		ctx.fillText(`${this.playTime}sec`, 20, 50);
	}

	#updateTime(){
		const now = Date.now()
		this.playTime =  Math.floor((now - this.startTime)/1000);
	}
}
```

<video width="100%" src="https://d3mjjrvt1qsw2m.cloudfront.net/Canvas api_20220206T065121203Z_6.mov"></video>

### 폭탄 갯수 추가

폭탄이 하나니 더 재미가 없는 것 같습니다. 폭탄 배열을 만들어서 폭탄을 잔뜩 만들어주도록 합니다.

```jsx
const BOMB_COUNT = 5;

const bombs = [...Array(BOMB_COUNT)].map(
	()=> new Bomb(canvasWidth, canvasHeight)
)
```

시간이 지나면서 bombs에 폭탄을 추가적으로 넣어주도록 합니다.

```jsx
setInterval(()=>{
	if(!collision) bombs.push(new Bomb(canvasWidth, canvasHeight))
},5000)
```

<video width="100%" src="https://d3mjjrvt1qsw2m.cloudfront.net/Canvas api_20220206T065129548Z_7.mov"></video>

갑자기 너무 어려워진 것 같습니다.

### 잔상 추가

잔상이 있으면 별거 아닌것도 재미있고 화려해보이기 마련입니다.

![Untitled 3.png](https://d3mjjrvt1qsw2m.cloudfront.net/20220201T163754685Z_Untitled%203.png)
> 저의 정치 성향과 무관한 이미지입니다.

잔상을 추가하는 방법은 간단합니다.

매 프레임마다 화면을 새로고치는 `clearRect`를 `fillRect` 로 교체하고, 반투명한 직사각형을 그리면 끝납니다.

```jsx
// ctx.clearRect(0, 0, canvasWidth, canvasHeight);
ctx.fillStyle = "rgba(255,255,255,0.2)"
ctx.fillRect(0, 0, canvasWidth, canvasHeight);
```

마무리 단계인 것 같아 격자무늬도 지워줍니다.

## 완성본

[GAME](http://canvas-game-unqocn.surge.sh/)


# 참고

[WebGL vs Canvas| Top Comparisons to Learn with Infographics](https://www.educba.com/webgl-vs-canvas/)

[Is there any reason for using WebGL instead of 2D Canvas for 2D games/apps?](https://stackoverflow.com/questions/21603350/is-there-any-reason-for-using-webgl-instead-of-2d-canvas-for-2d-games-apps)

[WebGL 바닥부터 해보기 - Aproid](https://aproid.github.io/2019/09/15/webgl-ground-up/)

[Why WebGL is faster than Canvas?](https://stackoverflow.com/questions/28867297/why-webgl-is-faster-than-canvas)

[캔버스 튜토리얼 - Web API | MDN](https://developer.mozilla.org/ko/docs/Web/API/Canvas_API/Tutorial)

[발전된 애니메이션 - Web API | MDN](https://developer.mozilla.org/ko/docs/Web/API/Canvas_API/Tutorial/Advanced_animations)

[스타일과 색 적용하기 - Web API | MDN](https://developer.mozilla.org/ko/docs/Web/API/Canvas_API/Tutorial/Applying_styles_and_colors)

[Window.devicePixelRatio - Web API | MDN](https://developer.mozilla.org/ko/docs/Web/API/Window/devicePixelRatio)

[Do I have to have the content.beginPath() and content.closePath()?](https://stackoverflow.com/questions/22432036/do-i-have-to-have-the-content-beginpath-and-content-closepath)

[Understanding the Device Pixel Ratio](https://tomroth.com.au/dpr/)
