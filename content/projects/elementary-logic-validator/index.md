+++
title = "1차논리 검증기"
description = "형식언어 ℒ과 Gentzen의 추론 규칙에 따른 논증이 타당한지 실시간으로 검증하는 기능을 가진 웹페이지"

weight = 202211

[extra]
year_begin = 2022
links = [
    { name="웹사이트", url="https://logic-validator.jangjunha.me" },
    { name="도움말", url="https://logic-validator.jangjunha.me/help/" },
]

cover = "screenshot.png"
featured = true
+++

고려대학교 〈기호논리학〉 수업과 〈계산이론〉, 〈프로그래밍언어〉 수업을 듣고 개인적으로 실습해보면서 만든 사이트입니다. 교재 [〈기호논리학〉][elementary-logic-book](Benson Mates, 김영정·선우환 역, 문예출판사, 1995)의 형식언어 ℒ과 수업에서 다룬 Gentzen의 추론 규칙을 바탕으로 합니다. 더 자세한 설명은 [도움말][help]을 확인하세요.

파서, 검증기 및 웹사이트 소스코드는 GitHub 저장소 [`elementary-logic-validator`][elementary-logic-validator-repo]에 공개되어 있습니다.

파서와 검증기, 웹사이트를 모두 Rust로 작성했습니다. Parser combinator 프레임워크 [nom][nom]을 이용해서 파서를 작성했고, 웹사이트는 Rust 웹 프레임워크인 [yew][yew]로 작성해서 wasm 타겟으로 빌드합니다.


## 스크린샷

<div class="[&_img]:max-h-[48rem] [&_img]:shadow-lg [&_img]:rounded">
{{ figure(src="./screenshot.png", alt="웹사이트 스크린샷") }}
</div>

[elementary-logic-book]: https://product.kyobobook.co.kr/detail/S000000548655
[elementary-logic-validator-repo]: https://github.com/jangjunha/elementary-logic-validator
[help]: https://logic-validator.jangjunha.me/help/
[nom]: https://github.com/Geal/nom
[yew]: https://yew.rs
