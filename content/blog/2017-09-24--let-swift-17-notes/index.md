+++
title = "Let' Swift 17 세션 노트"
description = "Let' Swift 17 컨퍼런스를 들으면서 간딘히 적어둔 메모입니다."
slug = "let-swift-17-notes"
date = "2017-09-24"

[taxonomies]
tags = ["swift", "ios", "conference", "reactorkit"]
+++

- Let'Swift 17
- 17\. 9\. 23, @전문건설회관

일부 세션을 들으면서 설명이나 키워드를 간단하게 적어두었습니다.

{{ figure(src="img_5011_cropped.jpg", alt="What's New in Swift 4 session", caption="김영후님 What's New in Swift 4 세션") }}

## What's New in Swift 4

- 발표자: 김영후 님

### keyPath Type

##### 예시

- `\Animal.name`

### Existential

Swift 3: `protocol<ProtocolA, ProtocolB>`  
Swift 4: `ProtocolA & ProtocolB`

### @objc 자동으로 추론되지 않음

##### 예외

- objc 메소드를 오버라이딩 한 경우
- 프로토콜 자체가 @objc 구현인 경우 (@IBAction, @IBOutlet, @NSAction, dynamic)

### JSON 컨버팅

- `Codable`(`Encodable`, `Decodable`) type
- `JSONEncoder`, `JSONDecoder`

- Nested도 가능
- Dictionary 타입도 디코드 가능

##### 모델 예제

```swift
struct User: Codable {
  let id: Int
  let name: String

  private enum CodingKeys: String, CodingKey {	// CodingKeys 라는 네이밍을 따라야
      case id = "user_id"
	  case name
  }
}
```

##### 디코딩

```swift
try JSONDecoder().decode(...)
```

- 메타프로그래밍 (컴파일러가 코드를 넣어주는 방식)

- 참고: &lt;Play with "Using JSON with Custom Types" Playground&gt;

## Swift, Kotlin와 모던 언어의 특징

- 발표자: kakao 유용하 님

- mutable
- Copy on Write

- Swift의 `inout`: 레퍼런스 같은 친구

## ReactorKit으로 단방향 반응형 앱 만들기

- 발표자: 스타일쉐어 전수열 님

### ViewController 생성

- ViewController를 생성할 때:
  - Reactor를 생성하고
  - ViewController에 바인딩

### ViewController 구현 - Action 발생시키기

- viewcontroller의 bind()에서 원하는 이벤트를 map
  - 이벤트가 발생하면 action으로 변환

### Reactor

- Action이 바로 상태를 바꾸지 않음. (비동기 처리가 있을 수 있으므로)
- Action이 발생하면 mutate(action) 함수가 호출되고, mutate(action) 함수에서 API콜 등의 처리를 한 후 mutation을 발생시킴.

- **mutation**: state를 변경하는 최소 단위.
- mutation이 발생하면 reduce(currentState, mutation) 함수가 호출되고, reduce(currentState, mutation) 함수에서는 이전 상태와 mutation을 가지고 state를 업데이트

### ViewController 구현 - State를 뷰에 반영

- reactor의 state를 map
- state가 바뀌면 새 state를 view에 반영
  - state를 map해서 state중 원하는 값을 뽑아옴
  - 해당 값을 view에 bind
