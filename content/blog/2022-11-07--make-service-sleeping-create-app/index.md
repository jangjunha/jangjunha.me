+++
title = "Firebase로 웹사이트 만들기"
date = "2022-11-07"

draft = true

[taxonomies]
tags = ["serverless", "firebase", "firestore", "gcp"]

[extra]
featured = true
+++

데이터를 어떻게 저장할지도 정했으니 이제 앱을 만들 차례입니다. 만들기에 앞서 School, Semester 문서는 앞서 정한 스키마에 맞추어 Firebase Console를 통해 미리 채워두었습니다.

원본 프로젝트의 소스코드가 [`heektime-web-v3` GitHub 저장소][heektime-web-v3 github]에 공개되어 있습니다. 글에는 Firebase 적용에 집중해서 최대한 간략하게 줄인 코드가 있으니 원본 코드가 궁금하시면 직접 저장소에서 확인하실 수 있습니다.

웹사이트는 React로 만들었습니다. 글에서는 다른 부분은 최대한 배제하고 Firebase와 통합하는 부분에만 집중합니다.

## 회원가입

사용자의 회원가입 절차는 다음 두 단계로 이루어집니다:

1. Firebase 인증에 회원 정보를 만듭니다.

   [인증 정보(username, password)를 제출하여 회원가입을 마치면 UID를 반환받습니다.](https://firebase.google.com/docs/auth/web/password-auth?hl=ko#create_a_password-based_account)

2. Firestore에 회원 문서를 만듭니다.

   반환받은 UID에 대한 회원 문서를 만들고 닉네임(username) 등의 프로필 정보를 저장합니다.

<aside class="bg-tint-200 px-6 rounded-3xl flex flex-row gap-4">
<div><p>✏️</p></div>
<div class="flex-auto">

Firebase 인증에서도 사용자의 닉네임(표시 이름), 프로필 사진 같은 간단한 프로필을 관리할 수 있지만 다른 사용자의 프로필에 접근할 수 없습니다. 이 프로젝트에서는 사용자가 다른 사용자의 데이터에 접근할 수 있어야 하므로 사용자 프로필 정보를 Firestore에 저장합니다.

</div>
</aside>

두 단계는 원자적이지 않습니다. 화면을 원자적으로 만들고 두 작업을 순차적으로 이어붙여서 실행시킬 수 있지만 네트워크 오류와 같은 다양한 이유로 두 번째 단계가 누락될 수 있어 이 경우에 대한 별도 처리가 필요합니다. 여기서는 1단계를 “회원가입”, 2단계를 “추가 정보 입력”이라고 부르고 각각 별개의 화면을 만들 것입니다. (“추가 정보 입력”은 선택이 아닌 필수입니다) 두 화면은 순차적으로 나타납니다.

<div class="flex gap-8 justify-center [&_img]:max-h-[480px]">
{{ figure(src="./step1-register.png", caption="1단계 회원가입", alt="이메일주소, 비밀번호 입력란이 있는 회원가입 화면") }}

{{ figure(src="./step2-additional.png", caption="2단계 추가 정보 입력", alt="닉네임 입력란이 있는 추가 정보 입력 화면") }}

</div>

사용자는 “회원가입” 후 이탈(혹은 네트워크 오류)할 수 있습니다. Firebase 인증에 인증 정보를 등록했으므로 이 경우에도 사용자는 로그인 할 수 있지만 곧바로 “추가 정보 입력” 화면을 띄워서 회원가입 절차를 마치도록 할 것입니다. 그리고 사용자가 “추가 정보 입력”을 마치지 않은 상태로는 다른 기능에 접근할 수 없도록 할 것입니다.

<div class="flex gap-8 justify-center [&_img]:max-h-[480px]">
{{ figure(src="./login.png", caption="2단계를 마치지 않은 사용자도 로그인 할 수 있습니다.", alt="이메일, 비밀번호를 입력하고 로그인 중인 화면") }}

{{ figure(src="./additional-empty.png", caption="그런 경우 바로 추가 정보 입력 화면을 보여줘야 합니다.", alt="추가 정보 입력 화면") }}

</div>

TODO: 요약된 LoginContext 코드, 설명

TODO: 요약된 RegisterPage, CreateUserInfoPage 코드, 설명

## 로그인 · 로그아웃

## 시간표 생성

## 시간표 목록 (유저 페이지)

## 시간표 보기

TODO: 실시간 업데이트 `onSnapshot()`만 간략히 소개

[heektime-web-v3 github]: https://github.com/jangjunha/heektime-web-v3
