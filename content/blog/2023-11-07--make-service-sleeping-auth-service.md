+++
title = "Firebase 인증에서 자체 인증 서버 사용하기"
description = ""
date = "2023-11-07"

[taxonomies]
tags = ["serverless", "firebase", "firebase-authentication", "gcp"]

[extra]
featured = true
+++

## 배경

Firestore 접근에 대한 인증은 Firebase 인증을 통해 처리됩니다. 따라서 자체 인증 서버를 Firebase 인증으로 완전히 전환할 생각을 가지고 있었습니다. Firebase 인증에서 [사용자 가져오기][auth-import-users]를 지원하며 기존에 사용하던 PBKDF2 해시를 지원함을 확인하고 마이그레이션 작업을 시작했으나 마이그레이션 도중 에러가 발생했습니다. 이후 [문서](https://firebase.google.com/docs/auth/admin/import-users?hl=ko#import_users_with_md5_sha_and_pbkdf_hashed_passwords)를 찾아보니...

> MD5, SHA, PBKDF 해싱 알고리즘에는 MD5, SHA1, SHA256, SHA512, PBKDF_SHA1, PBKDF2_SHA256이 포함됩니다. 이러한 해싱 알고리즘의 경우 비밀번호를 해시하는 데 사용되는 라운드 수(MD5의 경우 0~8192, SHA1, SHA256, SHA512의 경우 1~8192, PBKDF_SHA1 및 **PBKDF2_SHA256의 경우 0~120000**)를 제공해야 합니다.

기존 서비스의 경우 Werkzeug의 기본값인 [260,000라운드][werkzeug-pbkdf2-iterations]를 사용했으나 Firebase 인증에서 지원하는 최대값은 120,000라운드였습니다.

따라서 자체 인증 서버를 유지하는 것이 불가피한 상황이 되었습니다. 불행중 다행히도 Firebase 인증은 별도의 인증 서버를 사용할 수 있도록 하는 [커스텀 토큰 인증][auth-custom-token]을 지원합니다. 이를 사용하면 다음과 같은 로그인 흐름이 만들어집니다.

<div class="not-prose w-full">
<pre class="mermaid">
sequenceDiagram
    autonumber
    participant 클라이언트
    participant 자체 인증 서버
    participant Firebase 인증
    클라이언트->>자체 인증 서버: POST /login/
    자체 인증 서버-->>클라이언트: 커스텀 토큰
    클라이언트->>Firebase 인증: 커스텀 토큰
    Firebase 인증-->>클라이언트: ID 토큰
</pre>
</div>

## 웹사이트 수정

먼저 웹사이트를 수정합니다. 이전에는 `signInWithEmailAndPassword()`를 사용했지만, 이제는 먼저 자체 인증 서버에서 커스텀 토큰을 발급받고 그 결과를 `signInWithCustomToken()`에 전달해 로그인을 완료합니다.

```ts,hl_lines=7 24
import { signInWithCustomToken } from "firebase/auth";
import { login } from "/apis/auth-service";

const handleSubmit = async (): Promise<void> => {
  let token = null;
  try {
    token = await login(signInEmail, password);
  } catch (error) {
    switch (error.type) {
      case "invalid-credentials":
        window.alert("이메일 혹은 비밀번호가 잘못됐습니다.");
        break;
      case "unexpected":
        window.alert(
          `알 수 없는 오류가 발생했습니다. 계속되면 heektime@heek.kr 로 문의 부탁드립니다.`
        );
        break;
    }
  }
  if (token == null) {
    return;
  }

  await signInWithCustomToken(auth, token);
  navigate("/");
};
```

## 인증 서버

인증 서버에서는 Firebase Admin SDK에서 제공하는 `create_custom_token()` 함수를 사용해 커스텀 토큰을 발급할 수 있습니다.

```python,hl_lines=16
from firebase_admin.auth import create_custom_token

EXC = HTTPException(status_code=400, detail="Invalid credentials")

@app.post("/login/")
async def login(credential):
    user = session.query(User) \
        .filter(User.email == credential.email) \
        .one_or_none()
    if user is None:
        raise EXC
    if not check_password_hash(user.password_hash, credential.password):
        raise EXC

    uid = user.uid
    token = create_custom_token(uid)
    return {"uid": uid, "token": token}
```

## 마치며

이렇게 되면 자체 인증 서버를 유지해야 하므로 잠자는 서비스를 만드려는 첫 목표에서 멀어집니다. 때문에 고민 끝에 App Engine의 오토스케일링을 활용하여 요청이 있을 때만 서버를 실행시키도록 했습니다. `automatic_scaling.min_instances`를 0으로 설정하면 요청이 없을 때 서버가 실행되지 않게 됩니다. warmup 시간이 필요해 로그인에 3-5초 정도의 시간이 소요된다는 단점이 있지만 프로젝트를 돌아가는 상태로 아카이빙 하려는 목적을 고려해서 감수하기로 결정했습니다.

{{ make_service_sleeping_list() }}

[auth-import-users]: https://firebase.google.com/docs/auth/admin/import-users
[werkzeug-pbkdf2-iterations]: https://github.com/pallets/werkzeug/blob/2.2.3/src/werkzeug/security.py#L12
[auth-custom-token]: https://firebase.google.com/docs/auth/admin/create-custom-tokens
