+++
title = "heek.kr 도서관 통합검색"
description = "도서관 소장자료 통합 검색 사이트"

weight = 202303

[extra]
year_begin = 2023
links = [
    { name="웹사이트", url="https://heek.kr" },
    { name="GitHub (API)", url="https://github.com/jangjunha/heekkr-api/"},
    { name="GitHub (크롤러)", url="https://github.com/jangjunha/heekkr-resolver-simple/"}
]
cover = "heekkr-screenshot.png"
+++

"내 주변 도서관에서 원하는 책이 대출 가능할까?" 궁금해서 시작한 프로젝트입니다. 지금은 서울 시내에 있는 일부 구립 도서관의 검색을 지원하며, 도서의 대출 상태까지 확인할 수 있습니다.

<div class="[&_img]:max-h-[48rem] [&_img]:shadow-lg [&_img]:rounded">
{{ figure(src="./heekkr-screenshot.png", alt="웹사이트 스크린샷") }}
</div>

<https://heek.kr>

여러 도서관을 동시에 검색하여 검색이 완료되는대로 결과를 실시간으로 스코어링(정렬) 후 반환하도록 만들었습니다. 스코어링은 [Lucene][lucene]을 사용했습니다. 기술적으로는 Kotlin, Spring WebFlux 학습을 목표로 했습니다.

- API 서버 스택: Kotlin, Spring WebFlux
- 크롤링 서비스 스택: Python, gRPC
- 웹사이트 스택: TypeScript, React

[소스코드 (API 서버)](https://github.com/jangjunha/heekkr-api/)
[소스코드 (크롤링 서비스)](https://github.com/jangjunha/heekkr-resolver-simple/)
[소스코드 (웹사이트)](https://github.com/jangjunha/heekkr-web)

[lucene]: https://lucene.apache.org
