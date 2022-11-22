+++
title = "HeekTime"
description = "강의 검색 및 필터링에 특화된 대학생 시간표 작성 애플리케이션"

weight = 201603

[extra]
year_begin = 2016
year_end = 2022
links = [
    { name="App Store", url="https://itunes.apple.com/mr/app/heektime-hiigtaim/id1134379996" },
    { name="웹사이트", url="https://heektime.heek.kr" },
]

cover = "iPhone 8-1_timetable.png"
featured = true
+++

학교 시간표를 짤 때 원하는 강의를 찾기 어려워서 과제 겸 시작한 사이드프로젝트입니다. 이후에는 적용해보고 싶은 기술들을 적용해보면서 오랜 기간 운영해왔습니다.

- **Infra**

  - GKE에서 Firebase 기반 서버리스 아키텍처로 전환

    📝 관련 포스트: [〈잠자는 서비스 만들기〉](https://jangjunha.me/blog/make-service-sleeping/)

- **iOS** [\[App Store\]](https://itunes.apple.com/mr/app/heektime-hiigtaim/id1134379996)

  - ReactorKit 또는 RxMVVM 아키텍처를 적용해서 선언적 작성
  - [Pure DI][pure-di]로 명시적인 의존성 관리

- **Website** [\[웹사이트\]](https://heektime.heek.kr/) [\[GitHub\]](https://github.com/jangjunha/heektime-web-v3)

  - TypeScript React

## 포스트

- [〈HeekTime 프로젝트 히스토리〉](https://jangjunha.me/blog/heektime-project-history/)

- [〈잠자는 서비스 만들기〉](https://jangjunha.me/blog/make-service-sleeping/) 시리즈

## 스크린샷

<div class="[&_img]:max-h-[48rem] [&_img]:shadow-lg [&_img]:rounded">
{{ figure(src="./iPhone 8-1_timetable_framed.png", caption="시간표 화면") }}
{{ figure(src="./iPhone 8-4_timetable-list_framed.png", caption="시간표 목록 — 복제하거나 삭제할 수 있습니다") }}
{{ figure(src="./iPhone 8-2_search-term_framed.png", caption="강의 검색") }}
{{ figure(src="./iPhone 8-3_search-filter_framed.png", caption="강의 검색결과 필터") }}
{{ figure(src="./filter-category-01.png", caption="강의 분류 필터") }}
{{ figure(src="./iPhone 8-5_lecture-detail_framed.png", caption="강의 상세보기") }}

{{ figure(src="./heektime-web-screenshot.png", caption="웹사이트") }}

</div>

[pure-di]: https://github.com/devxoul/Pure
