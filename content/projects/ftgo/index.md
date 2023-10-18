+++
title = "FTGO"
description = "〈마이크로서비스 패턴〉 도서 실습 프로젝트"

weight = 202302

[extra]
year_begin = 2023
links = [
    { name="소비자 웹사이트", url="https://consumer.ftgo.jangjunha.me" },
    { name="매장 웹사이트", url="https://restaurant.ftgo.jangjunha.me" },
    { name="배달원 웹사이트", url="https://courier.ftgo.jangjunha.me" },
    { name="GitHub", url="https://github.com/jangjunha/ftgo/" },
]
cover = "ftgo-thumbnail.png"
featured = true
+++

[〈마이크로서비스 패턴〉][book] 도서의 예제를 실습하는 프로젝트입니다. [microservices-patterns/ftgo-application][ftgo-application]를 원본 프로젝트로 제 상황에 맞게 몇몇 다른 기술적인 선택을 하였습니다. Kotlin, protobuf/gRPC를 보다 많이 채용하였고, 소비자 주도 계약 테스트 프레임워크로 [Pact][pact]를 대신 사용하였습니다. 인증/인가 구현도 추가하였습니다.

Kotlin/Spring과 함께 마이크로서비스를 구현할 때 사용하기 좋은 패턴들을 공부했습니다. 개인적으로는 오케스트레이션 사가 패턴과 소비자 주도 계약 테스트 파트가 인상적으로 남습니다.

구현한 기능들을 사용해볼 수 있는 간단한 웹사이트를 만들어 두었습니다. 소비자/매장/배달원 각 역할별로 주문-승인-배달로 이어지는 주문 흐름이 구현되어 있습니다.

<div class="[&_img]:max-h-[48rem] [&_img]:shadow-lg [&_img]:rounded">
{{ figure(src="./ftgo-thumbnail.png", alt="웹사이트 스크린샷") }}
</div>

[Pact Broker](https://pact.ftgo.jangjunha.me)

[소비자 웹사이트](https://consumer.ftgo.jangjunha.me)

[매장 웹사이트](https://restaurant.ftgo.jangjunha.me)

[배달 웹사이트](https://courier.ftgo.jangjunha.me)

[소스코드 (서버)](https://github.com/jangjunha/ftgo/)

[소스코드 (protobuf/gRPC 명세)](https://github.com/jangjunha/ftgo-proto/)

[소스코드 (GraphQL 끝점)](https://github.com/jangjunha/ftgo-graphql-server/)

[소스코드 (웹사이트)](https://github.com/jangjunha/ftgo-web/)

[book]: https://microservices.io/book
[ftgo-application]: https://github.com/microservices-patterns/ftgo-application/
[pact]: https://docs.pact.io
