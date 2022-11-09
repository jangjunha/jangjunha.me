+++
title = "Firebase로 웹사이트 만들기"
date = "2022-11-09"

[taxonomies]
tags = ["serverless", "firebase", "firestore", "firebase-authentication", "gcp"]

[extra]
featured = true
+++

데이터를 어떻게 저장할지도 정했으니 이제 앱을 만들 차례입니다. 만들기에 앞서 School, Semester 문서는 이전 글에서 정한 스키마에 맞추어 Firebase
Console를 통해 미리 채워두었습니다.

원본 프로젝트의 소스코드가 [`heektime-web-v3` GitHub 저장소][heektime-web-v3 github]에 공개되어 있습니다. 글에서 소개하는 코드는 Firebase
적용에 집중해서 최대한 간략하게 줄였으니 원본 코드가 궁금하시면 저장소에서 직접 확인해주세요.

웹사이트는 React로 만들었습니다. 글에서는 다른 부분은 최대한 배제하고 Firebase 통합에만 집중하다보니 실제보다 단순화한 부분도 있음을 미리 밝힙니다.

## 회원가입

### 2단계 회원가입 절차

사용자의 회원가입 절차는 다음 두 단계로 이루어집니다:

1. Firebase Authentication에 **인증 정보**를 만듭니다.

   [인증 정보(username, password)를 제출하여 회원가입을 마치면 UID를 반환받습니다.][create_a_password-based_account]

2. Firestore에 **User 문서**를 만듭니다.

   반환받은 UID에 대한 회원 문서를 만들고 닉네임(username) 등의 **프로필 정보**를 저장합니다.

<aside class="bg-tint-200 px-6 rounded-3xl flex flex-row gap-4">
<div><p>✏️</p></div>
<div class="flex-auto">

Firebase Authentication에서도 사용자의 닉네임(표시 이름), 프로필 사진 같은 간단한 프로필을 관리할 수 있지만 자신이 아닌 다른 사용자의 프로필에 접근할
수 없습니다. 이 프로젝트에서는 사용자가 다른 사용자의 데이터에 접근할 수 있어야 하므로 사용자 프로필 정보를 Firestore에 저장하도록 했습니다.

</div>
</aside>

두 단계는 원자적이지 않습니다. 화면을 원자적으로 만들고 두 작업을 순차적으로 이어붙여서 실행시킬 수 있지만 네트워크 오류와 같은 다양한 이유로 두 번째 단계가 누락될 수 있어 이 경우에 대한 별도 처리가 필요합니다. 여기서는 1단계를 “회원가입”, 2단계를 “추가 정보 입력”이라고 부르고 각각 별개의 화면을 만들 것입니다. (“추가 정보 입력”은 선택이 아닌 필수입니다) 두 화면은 순차적으로 나타납니다.

<div class="flex gap-8 justify-center [&_img]:max-h-[480px]">
{{ figure(src="./step1-register.png", caption="1단계 회원가입", alt="이메일주소, 비밀번호 입력란이 있는 회원가입 화면") }}

{{ figure(src="./step2-additional.png", caption="2단계 추가 정보 입력", alt="닉네임 입력란이 있는 추가 정보 입력 화면") }}

</div>

사용자는 “회원가입” 후 이탈(혹은 네트워크 오류)할 수 있습니다. Firebase Authentication에 인증 정보를 등록했으므로 이 경우에도 사용자는 로그인 할 수 있지만 곧바로 “추가 정보 입력” 화면을 띄워서 회원가입 절차를 마치도록 할 것입니다. 그리고 사용자가 “추가 정보 입력”을 마치지 않은 상태로는 다른 기능에 접근할 수 없도록 할 것입니다.

<div class="flex gap-8 justify-center [&_img]:max-h-[480px]">
{{ figure(src="./login.png", caption="2단계를 마치지 않은 사용자도 로그인 할 수 있습니다.", alt="이메일, 비밀번호를 입력하고 로그인 중인 화면") }}

{{ figure(src="./additional-empty.png", caption="그런 경우 바로 추가 정보 입력 화면을 보여줘야 합니다.", alt="추가 정보 입력 화면") }}

</div>

차례대로 2단계 회원가입 절차에 해당하는 `RegisterPage`, `CreateUserInfoPage` 페이지를 하나씩 보겠습니다.

#### `RegisterPage`

<div class="[&_img]:border max-w-xl mx-auto">

{{ figure(src="./register-page.png", alt="회원가입 페이지. 이메일 입력란, 비밀번호 입력란, 가입 버튼이 있다.") }}

</div>

```tsx
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../firebase";

const RegisterPage = () => {
  const authUser = useContext(_FirebaseAuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (authUser !== null) {
    return <Navigate to="../create-user-info/" />; // -- (0)
  }

  const handleChangeEmail = (e) => setEmail(e.target.value);
  const handleChangePassword = (e) => setPassword(e.target.value);
  const handleClickSubmit = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password); // -- (1)
    } catch (err) {
      window.alert(err.message);
      return;
    }
  };

  return (
    <form>
      <h2>회원가입</h2>

      <label>
        <span>이메일</span>
        <input
          type="email"
          placeholder="exmaple@example.com"
          value={email}
          onChange={handleChangeEmail}
        />
      </label>

      <label>
        <span>비밀번호 (6자 이상)</span>
        <input
          type="password"
          placeholder="********"
          value={password}
          onChange={handleChangePassword}
        />
      </label>

      <button onClick={handleClickSubmit}>가입</button>
    </form>
  );
};
```

Firebase Authentication 회원가입은 정말 간단합니다.
(1) Firebase Authentication SDK에서 제공하는 [`createUserWithEmailAndPassword()`][createuserwithemailandpassword] 함수를
호출하는 것이 전부입니다.
(0) 회원가입을 마치면 context의 `authUser` 객체가 설정되는데 그러면 `CreateUserInfo` 페이지로 이동합니다. `_FirebaseAuthContext`는
Firebase Authentication 로그인 상태를 감싼 context인데, 코드는 밑에서 자세히 소개하겠습니다.

#### `CreateUserInfoPage`

<div class="[&_img]:border max-w-xl mx-auto">

{{ figure(src="./additional-info-page.png", alt="추가 정보 입력 페이지. 닉네임 입력란, 등록 버튼이 있다.") }}

</div>

```tsx
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

const CreateUserInfoPage = () => {
  const authUser = useContext(_FirebaseAuthContext);
  const userState = useContext(_UserDocumentContext);

  const [username, setUsername] = useState("");

  if (userState.status === "logged-in") {
    return <Navigate to="/" />;
  } // (0)

  const handleChangeUsername = (e) => {
    setUsername(e.target.value);
  };
  const handleClickSubmit = async () => {
    // `doc()` 함수로 문서를 가리키는 레퍼런스를 만들 수 있습니다.
    const userRef = doc(db, "users", authUser.uid);
    const usernameRef = doc(db, "indices", "user", "usernames", username);

    const error = await runTransaction(
      db,
      async (transaction): Promise<string | undefined> => {
        // (1)
        const usernameSnapshot = await transaction.get(usernameRef);
        if (usernameSnapshot.exists()) {
          return "이미 다른 회원이 사용 중인 닉네임입니다. 다른 닉네임을 사용해주세요.";
        }

        // (2)
        await transaction.set(userRef, {
          username,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }); // -- (2)-1
        await transaction.set(usernameRef, {
          value: authUser.uid,
        }); // -- (2)-2
      }
    );
    if (error !== undefined) {
      window.alert(error);
    }
  };

  return (
    <form>
      <h2>추가 정보 입력</h2>
      <p>닉네임 설정 후 서비스를 이용할 수 있습니다.</p>
      <br />

      <label>
        <span>닉네임 (4자 이상)</span>
        <input type="text" value={username} onChange={handleChangeUsername} />
      </label>

      <button onClick={handleClickSubmit}>등록</button>
    </form>
  );
};
```

<aside class="bg-tint-200 px-6 rounded-3xl flex flex-row gap-4">
<div><p>✏️</p></div>
<div class="flex-auto">

**username 고유성 보장하기**

RDB와 달리 Firestore에서는 특정 필드에 고유 제약조건을 걸 수 없습니다. 방법을 찾아보다가 stack overflow에서
[Brian Neisler님의 답변](https://stackoverflow.com/a/59892127)의 해결책을 선택했습니다. Firestore의 특정 컬렉션 내에서 문서 ID는
고유합니다. 이러한 특성을 이용하기 위해서 별도의 username 컬렉션을 만듭니다. 이 인덱스 컬렉션과 **트랜잭션**을 사용해서 username의 고유성을 유지하면서
User를 생성하거나 변경할 수 있고, 보안 규칙을 사용해서 이를 강제할 수 있습니다. 보안 규칙에 대한 내용은 나중에 별도의 글로 나눠서 다루려고 합니다.

</div>
</aside>

(1) 트랜잭션 안에서 사용자가 입력한 username이 이미 존재하는지 확인합니다. 그리고 (2)-1 username index 문서와 (2)-2 user 문서를 만듭니다.

username index 문서 쓰기 작업은 앞서 읽은 username 인덱스 문서에 변화가 없을 경우에만 성공하며, username index 문서와 user 문서는 원자적으로 생성됩니다. 따라서 username은 고유하게 됩니다.

만약에 username index 문서를 읽었을 때는 문서가 없었는데 username index를 쓰기 전에 다른 클라이언트가 해당 문서를 작성하면 어떻게 될까요?

> The transaction completes its write operations only if none of those documents changed during the transaction's execution.

Firestore 모바일/웹 라이브러리는 낙관적 동시성 제어(optimistic concurrency control) 방법을 사용합니다. 앞에서 말한 일이 일어나면 트랜잭션은
실패하고 재시도하게됩니다. (재시도 횟수는 정해져 있습니다) 그러면 이미 문서가 있으므로 다른 사람이 사용 중인 username이라는 에러 메시지를 보게 될 것입니다.

Firestore에서 트랜잭션을 사용하는 더 자세한 방법은
[〈Transactions and batched writes〉 — Firestore 문서][firestore transactions and batched writes]에, Firestore에서 트랜잭션의
동시성을 제어하는 방법은
[〈Transaction serializability and isolation〉 — Firestore 문서][firestore transaction serializability and isolation]에 자세히
나와있습니다.

이야기가 잠시 옆길로 샜네요. 다시 회원가입 로직으로 돌아와봅시다. 트랜잭션이 성공하고 문서가 쓰였으면 `_UserDocumentContext`에 해당 유저의 문서가
설정됩니다. 그럼 페이지 컴포넌트는 다시 렌더링될 것이고 (0)에 의해 첫 화면으로 이동하게 됩니다!

## 로그인 Context

이제 앞에서 넘어갔던 context들을 살펴볼 차례입니다. 회원가입 절차가 2단계로 이루어져있듯이 로그인 정보를 제공하는 context도 두 개의 저수준
contexts(`_FirebaseAuthContext`, `_UserDocumentContext`)로 이루어져 있습니다. 두 contexts를 회원가입 절차 순서대로 살펴보겠습니다.

#### `_FirebaseAuthContext`

```tsx
type FirebaseAuthState = AuthUser | null;

export const _FirebaseAuthContext =
  React.createContext<FirebaseAuthState>(null);

export const _FirebaseAuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState<FirebaseAuthState>(auth.currentUser);

  useEffect(() => {
    onAuthStateChanged(auth, (authUser): void => {
      setAuthUser(authUser);
    });
  }, []);

  return (
    <_FirebaseAuthContext.Provider value={authUser}>
      {children}
    </_FirebaseAuthContext.Provider>
  );
};
```

`_FirebaseAuthContext`의 값은 (FIR Auth에) 로그인 되어 있으면 Firebase Authentication 로그인 유저 정보 `AuthUser` 객체 또는 로그아웃 상태이면 `null`입니다. 구현은 Firebase Authentication을 추상화한 것이 전부입니다. `onAuthStateChanged()`에 리스너를 등록하면 인증 상태가 바뀔 떄마다 리스너가 호출되는데 그 값을 상태로 저장하고 다시 context 값으로 사용합니다.

#### `_UserDocumentContext`

(`_FirebaseAuthContext`를 확장한) Firestore에 저장된 유저 프로필 정보를 제공하는 context입니다. `_FirebaseAuthContext`에 의존합니다.

```tsx
type UserDocumentState =
  | { status: "logged-out" }
  | { status: "logging-in"; authUser: AuthUser }
  | { status: "not-exists"; authUser: AuthUser }
  | { status: "logged-in"; authUser: AuthUser; user: User };

type FetchState =
  | { stage: "loading"; id: string | null }
  | { stage: "fetched"; id: string; user: User | null };

export const _UserDocumentContext = React.createContext<UserDocumentState>({
  status: "logged-out",
});

export const _UserDocumentProvider = ({ children }) => {
  const authUser = useContext(_FirebaseAuthContext);

  const [state, setState] = useState<FetchState>({
    stage: "loading",
    id: null,
  });

  const uid = authUser?.uid ?? null;
  useEffect(() => {
    setState({ stage: "loading", id: uid }); // (1)
    if (uid === null) {
      return;
    }
    return onSnapshot(doc(db, "users", uid), (doc) => {
      if (!doc.exists()) {
        setState({ stage: "fetched", id: uid, user: null }); // (2)-2
        return;
      }
      const user = await doc.data();
      setState({ stage: "fetched", id: uid, user }); // (2)-1
    });
  }, [uid]);

  return (
    <_UserDocumentContext.Provider
      value={
        authUser === null
          ? { status: "logged-out" }
          : state.stage === "fetched" && state.id === uid
          ? state.user !== null
            ? { status: "logged-in", authUser, user: state.user }
            : { status: "not-exists", authUser }
          : { status: "logging-in", authUser }
      }
    >
      {children}
    </_UserDocumentContext.Provider>
  );
};
```

(1) FIR Auth uid가 변하면 상태를 로딩 중으로 바꾸고, uid에 대한 `User` 문서를 요청합니다. (2)-1 `User` 문서를 받아오면 이를 상태에 저장합니다. (2)-2 만약에 해당 문서가 없다면 `null`로 저장합니다. 그럼 다시 상태에 따라 로그아웃됨(`logged-out`), 로그인 중(`logging-in`), 문서 없음(`not-exists`), 로그인 됨(`logged-in`) 상태로 나누어서 context 값을 제공하게 됩니다.

대부분의 페이지에서는 이 context를 다시 추상화한 `LoginContext`를 사용하게 되고(사용해야만 하고), 좀 더 자세한 로그인 상태가 필요한 회원가입, 로그인 페이지 등에서는 저수준의 `_FirebaseAuthContext`나 `_UserDocumentContext`를 직접 사용하게 됩니다.

#### `LoginContext`

앞선 두 contexts는 일반적으로 쓰이지 않습니다. 이름 앞에 underscore(`_`)를 붙인 이유이기도 합니다. 대부분의 경우에는 여기서 만든 `LoginContext`를
사용하게 됩니다. 2단계 회원가입 절차는 복잡합니다. 애플리케이션의 모든 곳에서 이런 상태를 고려하는 것은 골치아픈 일입니다. 우리는 단지 사용자가 로그인했는지,
로그인하지 않았는지를 원할 뿐입니다. `LoginContext`가 그런 일을 합니다. 앞선 두 contexts를 추상화해서 사용자(consumer)에게 간단한 상태를
제공합니다.

```tsx
export const LoginContext = React.createContext<{
  uid: string;
  user: User;
} | null>(null);

export const LoginProvider = ({ children }) => {
  const state = useContext(_UserDocumentContext);
  if (state.status === "logging-in") {
    return <Loading />;
  } // -- (1)
  if (state.status === "not-exists") {
    return <Navigate to="/sign-up/create-user-info/" />;
  } // -- (2)
  return (
    <LoginContext.Provider
      value={
        state.status === "logged-in"
          ? { uid: state.authUser.uid, user: state.user }
          : null
      }
    >
      {children}
    </LoginContext.Provider>
  );
};
```

`LoginContext`는 사용자의 로그인 상태 정보를 담고 있습니다. 로그인이 되어있으면 uid와 `User` 값을 가지고, 되어 있지 않으면 `null` 값을 가집니다.
그 외에 추가적으로 중간 상태에 대한 처리가 있습니다. (1) 로그인이 진행 중이면 로딩 바를 보여주고, (2) 추가 정보 입력을 마치지 않았으면 추가 정보 입력
페이지로 이동시킵니다. `LoginContext`는 고수준 context로 두 저수준 context에 의존해서 앞에서 말한 작업을 처리합니다.

이로써 `LoginProvider`는 context의 값이 로그인 사용자 정보 또는 `null`임을 보장합니다. 그 외의 경우에는 `children`이 렌더되지 않으므로
'로딩 중' 또는 '회원가입 미완료'와 같은 중간 상태에 대한 고려를 하지 않아도 됩니다.

## 로그인

#### `SignInPage`

<div class="[&_img]:border max-w-xl mx-auto">

{{ figure(src="./login-page.png", alt="로그인 페이지. 이메일(또는 구.ID) 입력란, 비밀번호 입력란, 로그인 버튼이 있다.") }}

</div>

```tsx
import { signInWithEmailAndPassword } from "firebase/auth";

const LEGACY_USER_EMAIL_DOMAIN = "user.heektime.heek.kr";

const SignInPage = (): React.ReactElement => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleChangeEmail = (e) => {
    setEmail(e.target.value);
  };
  const handleChangePassword = (e) => {
    setPassword(e.target.value);
  };
  const handleClickSubmit = async () => {
    // (1)
    const signInEmail = email.includes("@")
      ? email
      : `${email}@${LEGACY_USER_EMAIL_DOMAIN}`;

    // (2)
    try {
      await signInWithEmailAndPassword(auth, signInEmail, password);
    } catch (err) {
      window.alert(err.message);
      return;
    }

    navigate("/");
  };

  return (
    <Layout>
      <form>
        <h2>로그인</h2>

        <label>
          <span>이메일 (또는 구.ID)</span>
          <input
            type="email"
            placeholder="example@example.com"
            value={email}
            onChange={handleChangeEmail}
          />
        </label>

        <label>
          <span>비밀번호</span>
          <input
            type="password"
            placeholder="********"
            value={password}
            onChange={handleChangePassword}
          />
        </label>

        <button onClick={handleClickSubmit}>로그인</button>
      </form>
    </Layout>
  );
};
```

Firebase Authentication SDK에 있는 [`signInWithEmailAndPassword()`][signinwithemailandpassword]를 사용해서 간단하게 구현했습니다.

<aside class="bg-tint-200 px-6 rounded-3xl flex flex-row gap-4">
<div><p>✏️</p></div>
<div class="flex-auto">

약간 지저분한 로직은 로그인 아이디를 username에서 이메일로 변경해서 그렇습니다. 처음에 만들 때 username을 로그인 아이디로 사용하도록 하고 이메일주소를
받지 않았는데 사용자가 비밀번호를 잊었을 때 사용자를 인증할 수 있는 수단이 없다는 문제가 있어서 로그인 아이디를 이메일주소로 바꿨습니다. 하지만 기존 사용자는
가입할 때 이메일을 입력하지 않았으므로 계속해서 username으로 로그인 할 수 있어야 합니다. 이럴 때 임의로 `<username>@user.heektime.heek.kr`이라는
이메일 주소를 사용하도록 처리했습니다. (그리고 Firebase Authentication의 비밀번호 로그인은 사용자 아이디로 이메일만을 허용하기도 합니다.)

</div>
</aside>

## 시간표 생성 — `CreateTimetablePage`

<div class="[&_img]:border max-w-xl mx-auto">

{{ figure(src="./create-timetable-page.png", alt="새 시간표 만들기 페이지. 시간표 이름 입력란, 학교 선택 select, 학기 선택 select, 만들기 버튼이 있다.") }}

</div>

페이지 코드 자체는 너무 길어서 코드의 일부만 가져왔습니다. `useSemester()` hook을 보면 컬렉션 내의 문서들을 쿼리하는 방법을 알 수 있습니다.

```typescript
const querySnapshot = await getDocs(
  query(
    collection(db, "schools", schoolID, "semesters"),
    where("status", "==", "normal")
  )
);
const semesters = querySnapshot.docs.map((snapshot): [string, Semester] => {
  const data = await semesterCodec.decode(snapshot.data());
  return [snapshot.id, data];
});
```

- `/schools/<schoolID>/semesters` 컬렉션에서 `status`가 `normal` 인 컬렉션을 쿼리합니다.

- [`getDocs()`][getdocs] 메소드로 쿼리를 실행하면 [`QuerySnapshot`][querysnapshot]을 결과로 받습니다.

- [`QuerySnapshot.docs`][querysnapshotdocs]를 통해 개별 문서 스냅샷의 배열인 [`QueryDocumentSnapshot`][querydocumentsnapshot]`[]`을 받아올 수 있고,

- 다시 [`QueryDocumentSnapshot.data()`][querydocumentsnapshotdata] 메소드를 호출하면 문서 내용을 얻어낼 수 있습니다.

문서를 만드는 방법은 `handleClickSubmit()` 함수에서 볼 수 있습니다.

```typescript
const handleClickSubmit = async () => {
  const semesterRef = doc(
    db,
    "schools",
    selectedSchoolID,
    "semesters",
    selectedSemesterID
  );

  await setDoc(doc(db, "users", userID, "timetables", timetableID), {
    title,
    semester: semesterRef,
    visibility: "public",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  navigate(`../timetable/${timetableID}/`);
};
```

- [`setDoc()`][setdoc] 함수로 `/users/<id>/timetables/<id>` 경로에 시간표를 만듭니다. [`setDoc()`][setdoc] 함수는 이미 문서가 있는 경우 덮어쓴다는 점에 유의해주세요.

- 데이터 필드에 [DocumentReference][documentereference]를 넣으면 reference 타입 값이 됩니다.

- [`serverTimestamp()`][servertimestamp] 함수를 사용하면 값을 서버의 현재시각으로 설정할 수 있습니다. Firestore 보안 규칙을 이용하면 문서 생성 시 특정 필드에 `serverTimestamp()` 값만 허용하도록 강제할 수 있습니다. 이런 방법으로 `createdAt` 필드가 일관된 값을 유지하도록 할 수 있습니다.

## 시간표 보기 — `TimetablePage`

<div class="[&_img]:border max-w-xl mx-auto">

{{ figure(src="./timetable-page.png", alt="시간표 페이지. 격자형 시간표에 몇몇 강의들이 등록돼있는 시간표 레이아웃 화면.") }}

</div>

시간표 화면에서는 `Timetable` 문서와 그 하위의 `Lecture` 문서들을 사용합니다. 시간표 화면에서는 실시간 업데이트를 사용했습니다. Firestore SDK를 이용하면 서버에서 불러온 전역 상태를 관리하는 일을 SDK에 맡기는 효과를 얻을 수 있습니다. 옵션을 통해 이미 캐싱된 문서가 있으면 네트워크 요청 없이 불러올 수도 있고, 실시간 업데이트를 사용하면 문서에 변경이 생겼을 때 그것을 감지하고 문서와 애플리케이션을 최신 상태로 동기화 시킬 수 있습니다.

실시간 업데이트를 사용하는 두 쿼리를 가져왔습니다. `useTimetable()`은 단일 문서를 구독하고, `useLectures()`는 여러 문서를 구독합니다. 이번에는 에러
상태 부분도 그대로 가져와봤습니다. [`onSnapshot()`][onsnapshot] 함수에 인자로 [`DocumentReference`][documentreference]를 주느냐 [`Query`][query]([`CollectionReference`][collectionreference]는 [`Query`][query]를 상속받습니다)를 주느냐에 따라 리스너 함수의 인자로 단일 문서를 나타내는 [`DocumentSnapshot`][documentsnapshot]가 주어지냐 또는 여러 문서를 나타내는 [`QuerySnapshot`][querysnapshot]가 주어지냐가 달라질 뿐 크게 다른 부분은 없습니다.

#### `useTimetable()`

```typescript
type FetchState =
  | { stage: "loading" }
  | { stage: "fetched"; id: string; timetable: Timetable }
  | { stage: "error"; message: string };

const useTimetable = (userID: string, timetableID: string): FetchState => {
  const [fetchState, setFetchState] = useState<FetchState>({
    stage: "loading",
  });

  useEffect(() => {
    setFetchState({ stage: "loading" });
    const unsubscribe = onSnapshot(
      doc(db, "users", userID, "timetables", timetableID),
      (snapshot) => {
        if (!snapshot.exists()) {
          setFetchState({
            stage: "error",
            message: "시간표를 찾을 수 없습니다.",
          });
          return;
        }
        const data = await snapshot.data();
        setFetchState({ stage: "fetched", id: snapshot.id, timetable: data });
      }
    );
    return unsubscribe;
  }, [userID, timetableID]);

  return fetchState;
};
```

#### `useLectures()`

```typescript
type LecturesFetchState =
  | { stage: "loading" }
  | { stage: "fetched"; lectures: [string, UserLecture][] }
  | { stage: "error"; message: string };

const useLectures = (
  userID: string,
  timetableID: string
): LecturesFetchState => {
  const [fetchState, setFetchState] = useState<LecturesFetchState>({
    stage: "loading",
  });

  useEffect(() => {
    setFetchState({ stage: "loading" });
    const unsubscribe = onSnapshot(
      collection(db, "users", userID, "timetables", timetableID, "lectures"),
      (querySnapshot) => {
        const lectures = querySnapshot.docs.map(
          (snapshot): [string, UserLecture] => {
            const data = await snapshot.data();
            return [snapshot.id, data];
          }
        );
        setFetchState({ stage: "fetched", lectures });
      }
    );
    return unsubscribe;
  }, [userID, timetableID]);

  return fetchState;
};
```

더 자세한 사용법은 [〈Get realtime updates with Cloud Firestore〉 — Firestore 문서][get realtime updates with cloud firestore]에 나와있습니다. 참고로 실시간 업데이트의 경우 결과 집합에 문서 추가되거나, 갱신되거나, 삭제되어 읽기가 발생할 때마다 과금합니다.

## 끝맺으며

실제 코드도 가져오고 현실적인 이슈도 다루다보니 글 자체가 생각보다 많이 길어졌습니다. 그래도 Firestore 사용 자체는 어렵지 않았고 실시간 업데이트, 캐싱, 동시성 제어에 대한 고민의 결과를 볼 수 있어 좋았습니다. 아! 여기선 다루지 않았지만 보안 규칙도요. 보안 규칙을 작성한 이야기도 따로 글로 작성해두려고 합니다. 아마 다음 글이 될 것 같은데, 살짝만 미리 밝히자면 레퍼런스가 적어서 아주 만족스럽지는 않았지만 필요한 건 대부분 할 수 있겠다는 느낌이었습니다. 보안 규칙을 사용하려는 분들에게 다음 글이 도움이 되길 바랍니다.

{{ make_service_sleeping_list() }}

[heektime-web-v3 github]: https://github.com/jangjunha/heektime-web-v3
[create_a_password-based_account]: https://firebase.google.com/docs/auth/web/password-auth?hl=ko#create_a_password-based_account
[firestore transactions and batched writes]: https://firebase.google.com/docs/firestore/manage-data/transactions?hl=en
[firestore transaction serializability and isolation]: https://firebase.google.com/docs/firestore/transaction-data-contention?hl=en
[get realtime updates with cloud firestore]: https://firebase.google.com/docs/firestore/query-data/listen?hl=en
[createuserwithemailandpassword]: https://firebase.google.com/docs/reference/js/auth.md#createuserwithemailandpassword
[signinwithemailandpassword]: https://firebase.google.com/docs/reference/js/auth.md#signinwithemailandpassword
[getdocs]: https://firebase.google.com/docs/reference/js/firestore_.md?hl=en#getdocs
[setdoc]: https://firebase.google.com/docs/reference/js/firestore_lite.md?hl=en#setdoc
[onsnapshot]: https://firebase.google.com/docs/reference/js/firestore_.md?hl=en#onsnapshot
[servertimestamp]: https://firebase.google.com/docs/reference/js/firestore_lite.md?hl=en#servertimestamp
[documentreference]: https://firebase.google.com/docs/reference/js/firestore_.documentreference?hl=en
[collectionreference]: https://firebase.google.com/docs/reference/js/firestore_.collectionreference?hl=en
[query]: https://firebase.google.com/docs/reference/js/firestore_.query?hl=en
[documentsnapshot]: https://firebase.google.com/docs/reference/js/firestore_.documentsnapshot?hl=en
[querysnapshot]: https://firebase.google.com/docs/reference/js/firestore_.querysnapshot?hl=en
[querysnapshotdocs]: https://firebase.google.com/docs/reference/js/firestore_.querysnapshot.md?hl=en#querysnapshotdocs
[querydocumentsnapshot]: https://firebase.google.com/docs/reference/js/firestore_.querydocumentsnapshot?hl=en
[querydocumentsnapshotdata]: https://firebase.google.com/docs/reference/js/firestore_.querydocumentsnapshot.md?hl=en#querydocumentsnapshotdata
