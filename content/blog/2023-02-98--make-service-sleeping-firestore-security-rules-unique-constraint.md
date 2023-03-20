+++
title = "Firestore 보안 규칙 작성하기 (2) 고유성 보장하기"
description = ""
date = "2023-02-04"
draft = true

[taxonomies]
tags = ["serverless", "firebase", "firestore", "gcp"]

[extra]
featured = true
+++

Brian Neisler님이 작성하신 스택오버플로우 답변<https://stackoverflow.com/a/59892127>의 해결책과 코드를 사용했습니다. 진행 중인 프로젝트에 맞게 코드를 약간 수정하고 설명과 테스트 코드를 덧붙였습니다. 이 글은 원 답변의 [CC BY-SA][cc-by-sa] 라이센스를 따라 이용하실 수 있습니다.

---

이전 글에서 Firebase 보안 규칙에 대해서 간단히 알아보고, 회원 정보에 대한 보안 규칙을 거의 작성했습니다. 또 Firebase 에뮬레이터를 활용해서 보안 규칙을 테스트 하는 방법도 알아보았습니다.

이전: 보안 규칙의 구조, `read`(`get`, `list`), `write`(`create`, `update`) 동작에 대한 접근 허용하기, 사용자 로그인 처리하기, 소유자만 수정할 수 있도록 하기, 필드를 제약하는 방법, 필드의 값을 검증하기, `createdAt` 및 `updatedAt` 필드 최신 유지하기

이 글: 고유성 유지하기. 보안 규칙에서 다른 문서에 접근하기, 일괄 쓰기/트랜잭션 처리하기

## Username 고유성 유지하기

Firestore에서는 특정 필드의 고유성을 보장해주는 기능을 제공하지 않습니다. 하지만 다른 방법을 통해 구현할 수 있습니다.

Firestore에서 문서의 ID는 고유합니다. `username`을 하나의 문서로 보면 `username`을 고유하게 유지할 수 있습니다.

먼저 `/indices/user/usernames/{username}` 경로에 있는 인덱스 문서의 보안 규칙을 작성해봅시다. 인덱스 문서의 키는 문서의 ID이고 문서의 내용으로는 인덱스의 소유자를 나타내는 `value` 필드 단 하나만 갖습니다. 당연히 인덱스 생성 시에는 소유자를 자신으로 지정해야 하고, 삭제 시에는 자신이 소유한 인덱스만 삭제할 수 있어야 할 것입니다.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    ...

    // Indices for unique constraint
    match /indices {
      match /user/usernames/{username} {
        allow get: if true;

        allow create: if request.resource.data.value == request.auth.uid;

        allow delete: if resource.data.value == request.auth.uid;
      }
    }
  }
}
```

사용자는 한 트랜잭션 안에서 인덱스 문서와 회원 문서를 동시에 생성/수정해야합니다. 보안 규칙에서는 둘을 함께 수정했는지 검사합니다. 인덱스 문서의 ID가 고유하기 때문에 회원 문서의 username 필드는 자연스레 고유성이 보장됩니다.

지금까지는 검증 과정에서 `request.resource.data`를 통해 현재 문서만을 살펴봤습니다. 이제는 회원 문서를 수정할 때 username 문서를 확인하고, 그 반대도 확인해야합니다. [Firebase 보안 규칙에서는 다른 문서 접근을 위해 `get()`, `getAfter()`, `exists()`, `existsAfter()` 함수를 제공합니다.](https://firebase.google.com/docs/firestore/security/rules-conditions?hl=en#access_other_documents)

(앞으로는 단순함을 위해 이전 글에서 다뤘던 다른 조건은 생략합니다)

회원 문서를 만들 때 해당 `username`에 대한 올바른(사용 가능한) 인덱스도 같이 생성하도록 강제해봅시다.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow create: if
        getAfter(
          /databases/$(database)/documents/indices/user/usernames/$(request.resource.data.username)
        ).data.value == userId;
    }
  }
}
```

현재 트랜잭션 처리 이후 시점의 인덱스 문서를 가져와서, `value` 값이 현재 회원의 ID와 일치하는지 검사합니다. 인덱스 문서가 존재하고, 소유자가 본인이어야 합니다.

이번엔 반대도 처리해봅시다. 인덱스만 만들고 회원 정보는 만들지 않으면 안되니까요.

```rules,hl_lines=8-10
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /indices {
      match /user/usernames/{username} {
        allow create: if
          request.resource.data.value == request.auth.uid
          && getAfter(
            /databases/$(database)/documents/users/$(request.resource.data.value)
          ).data.username == username;
      }
  }
}
```

이제 `username` 중복 없이 회원을 생성할 수 있게 됐습니다!

### 인덱스 유틸리티 함수 만들기

`username` 수정은 이보단 약간 복잡합니다. 수정에 대한 보안 규칙을 작성하기 전에 인덱스 작업에 대한 일반화된 함수들을 도입하겠습니다. 이 함수들은 원글의 답변에서 가져온 함수들입니다.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    ...

    function getUserAfter(id) {
      return getAfter(/databases/$(database)/documents/users/$(id))
    }

    function getUserBefore(id) {
      return get(/databases/$(database)/documents/users/$(id))
    }

    function userExistsAfter(id) {
      return existsAfter(/databases/$(database)/documents/users/$(id))
    }


    // Indices for unique constraint

    match /indices {
      ...
    }

    function getIndexAfter(path) {
      return getAfter(/databases/$(database)/documents/indices/$(path))
    }

    function getIndexBefore(path) {
      return get(/databases/$(database)/documents/indices/$(path))
    }

    function indexExistsAfter(path) {
      return existsAfter(/databases/$(database)/documents/indices/$(path))
    }

    function indexExistsBefore(path) {
      return exists(/databases/$(database)/documents/indices/$(path))
    }
  }
}
```

앞서 작성했던 보안 규칙도 위 함수를 이용하도록 바꿔봅시다.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow create: if
        getIndexAfter(
          /user/usernames/$(getUserAfter(userId).data.username)
        ).data.value == userId;
    }

    match /indices {
      match /user/usernames/{username} {
        allow create: if
          request.resource.data.value == request.auth.uid
          && getUserAfter(
            getIndexAfter(/user/usernames/$(username)).data.value
          ).data.username == username;
      }
    }
  }
}
```

### username 수정

수정 시에는 1) 이전에 소유하던 username 인덱스를 삭제하고, 2) 새 username 인덱스를 만들고, 3) 회원 문서의 username을 수정해야합니다. 마찬가지로 일관성 유지하기 위해서는 이 작업들이 모두 한 트랜잭션 안에서 이뤄져야합니다. 생성과 다른 점은 이전에 사용하던 username 인덱스를 놓아주어야(삭제해야) 한다는 점입니다.

생성 때는 인덱스 검사를 항상 해야하지만, 수정 때는 `username` 필드를 변경하지 않을 수도 있습니다. `username` 필드가 변경됐을 때만 인덱스 검사를 하도록 해야합니다.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow update: if
        && getIndexAfter(/user/usernames/$(getUserAfter(userId).data.username)).data.value == userId
        && (
          !('username' in request.resource.data.diff(resource.data).affectedKeys())
          || (
            !indexExistsBefore(/user/usernames/$(getUserAfter(userId).data.username))
            && !indexExistsAfter(/user/usernames/$(getUserBefore(userId).data.username))
          )
        );
    }

    match /indices {
      match /user/usernames/{username} {
        allow delete: if
          resource.data.value == request.auth.uid
          && (
            !userExistsAfter(getIndexBefore(/user/usernames/$(username)).data.value)
            || getUserAfter(getIndexBefore(/user/usernames/$(username)).data.value).data.username != username
          );
      }
    }
  }
}
```

### 테스트 작성하기

```tsx
describe("유저 정보", () => {
  async function setupUser(db, id, username) {
    const userRef = doc(db, "users", id);
    await setDoc(userRef, {
      username,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // NOTE: 테스트 유저 생성 시 잊지 말고 인덱스도 함께 만들어줘야 합니다!
    await setDoc(doc(db, "indices", `user/usernames/${username}`), {
      value: userRef.id,
    });
  }

  describe("생성", () => {
    it("인증정보의 ID와 일치하고 스키마가 일치하는 유저 생성은 성공해야 함", async () => {
      const kiinDb = testEnv.authenticatedContext("id02").firestore();

      // 이제 username 인덱스도 함께(batch) 만들어야 합니다.
      const batch = writeBatch(kiinDb);
      const kiinUserRef = doc(kiinDb, "users", "id02");
      batch.set(kiinUserRef, {
        username: "Kiin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(kiinDb, "indices", "user/usernames/Kiin"), {
        value: kiinUserRef.id,
      });
      await assertSucceeds(batch.commit());
    });

    it("올바른 username 인덱스 생성 없이는 실패해야 함", async () => {
      const kiinDb = testEnv.authenticatedContext("id02").firestore();

      // 아예 미생성
      await assertFails(
        setDoc(doc(kiinDb, "users", "id02"), {
          username: "Kiin",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      // 일치하지 않는 username으로 생성
      const batch = writeBatch(kiinDb);
      const kiinUserRef = doc(kiinDb, "users", "id02");
      batch.set(kiinUserRef, {
        username: "Ellim",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(kiinDb, "indices", "user/usernames/Kiin"), {
        value: kiinUserRef.id,
      });
      await assertFails(batch.commit());
    });

    it("중복된 username으로 생성 시 실패해야 함", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setupUser(context.firestore(), "id01", "Faker");
      });

      const db = testEnv.authenticatedContext("id02").firestore();
      const userRef = doc(db, "users", "id02");

      // Attempt 1 - expected process
      const batch1 = writeBatch(db);
      batch1.set(userRef, {
        username: "Faker",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch1.set(doc(db, "indices", "user/usernames/Faker"), {
        value: userRef.id,
      });
      await assertFails(batch1.commit());

      // Attempt 2 - 남의 Index 변경
      const batch2 = writeBatch(db);
      batch2.set(userRef, {
        username: "Faker",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch2.update(doc(db, "indices", "user/usernames/Faker"), {
        value: userRef.id,
      });
      await assertFails(batch2.commit());

      // Attempt 3 - 남의 Index 삭제 후 재생성
      const batch3 = writeBatch(db);
      batch3.set(userRef, {
        username: "Faker",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch3.delete(doc(db, "indices", "user/usernames/Faker"));
      batch3.set(doc(db, "indices", "user/usernames/Faker"), {
        value: userRef.id,
      });
      await assertFails(batch3.commit());
    });
  });

  describe("수정", () => {
    it("올바른 수정 시도는 성공해야 함", async () => {
      ...

      // Attempt 2 - username 변경
      // username을 수정하려면 다음 작업들을 모두 한 트랜잭션 안에서 해야합니다:
      //   1) 이전 인덱스 삭제
      //   2) 새 인덱스 생성
      //   3) 회원 문서 수정
      const batch = writeBatch(fakerDb);
      const userRef = doc(fakerDb, "users", "id01");
      batch.update(userRef, {
        username: "Hide On Bush",
        updatedAt: serverTimestamp(),
      });
      batch.delete(doc(fakerDb, "indices", "user/usernames/Faker"));
      batch.set(doc(fakerDb, "indices", "user/usernames/Hide On Bush"), {
        value: userRef.id,
      });
      await assertSucceeds(batch.commit());
    });

    it("닉네임 index 관리 제대로 안하면 실패해야 함", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setupUser(db, "id01", "Faker");
      });

      const fakerDb = testEnv.authenticatedContext("id01").firestore();
      const userRef = doc(fakerDb, "users", "id01");

      // Index 삭제 누락
      const batch1 = writeBatch(fakerDb);
      batch1.update(userRef, {
        username: "Hide On Bush",
        updatedAt: serverTimestamp(),
      });
      batch1.set(doc(fakerDb, "indices", "user/usernames/Hide On Bush"), {
        value: userRef.id,
      });
      await assertFails(batch1.commit());

      // Index 생성 누락
      const batch2 = writeBatch(fakerDb);
      batch2.update(userRef, {
        username: "Hide On Bush",
        updatedAt: serverTimestamp(),
      });
      batch2.delete(doc(fakerDb, "indices", "user/usernames/Faker"));
      await assertFails(batch2.commit());

      // Index 잘못 생성
      const batch3 = writeBatch(fakerDb);
      batch3.update(userRef, {
        username: "Hide On Bush",
        updatedAt: serverTimestamp(),
      });
      batch3.delete(doc(fakerDb, "indices", "user/usernames/Faker"));
      batch3.set(doc(fakerDb, "indices", "user/usernames/Showmaker"), {
        value: userRef.id,
      });
      await assertFails(batch3.commit());
    });

    it("이미 존재하는 username으로 바꿀 수 없어야 함", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setupUser(db, "id01", "Faker");
        await setupUser(db, "id02", "Keria");
      });

      const fakerDb = testEnv.authenticatedContext("id01").firestore();
      const fakerRef = doc(fakerDb, "users", "id01");
      const keriaRef = doc(fakerDb, "users", "id02");

      // Attempt 1 - expected process
      const batch1 = writeBatch(fakerDb);
      batch1.update(fakerRef, {
        username: "Keria",
        updatedAt: serverTimestamp(),
      });
      batch1.delete(doc(fakerDb, "indices", "user/usernames/Faker"));
      batch1.set(doc(fakerDb, "indices", "user/usernames/Keria"), {
        value: fakerRef.id,
      });
      await assertFails(batch1.commit());

      // Attempt 2 - 임의로 남의 index update 시도
      const batch2 = writeBatch(fakerDb);
      batch2.update(fakerRef, {
        username: "Keria",
        updatedAt: serverTimestamp(),
      });
      batch2.delete(doc(fakerDb, "indices", "user/usernames/Faker"));
      batch2.update(doc(fakerDb, "indices", "user/usernames/Keria"), {
        value: fakerRef.id,
      });
      await assertFails(batch2.commit());

      // Attempt 3 - 임의로 남의 index 삭제후 재생성 시도
      const batch3 = writeBatch(fakerDb);
      batch3.update(fakerRef, {
        username: "Keria",
        updatedAt: serverTimestamp(),
      });
      batch3.delete(doc(fakerDb, "indices", "user/usernames/Faker"));
      batch3.delete(doc(fakerDb, "indices", "user/usernames/Keria"));
      batch3.set(doc(fakerDb, "indices", "user/usernames/Keria"), {
        value: fakerRef.id,
      });
      await assertFails(batch3.commit());

      // Attempt 4 - Index 맞교환 시도
      const batch4 = writeBatch(fakerDb);
      batch4.update(fakerRef, {
        username: "Keria",
        updatedAt: serverTimestamp(),
      });
      batch4.update(doc(fakerDb, "indices", "user/usernames/Keria"), {
        value: fakerRef.id,
      });
      batch4.update(doc(fakerDb, "indices", "user/usernames/Faker"), {
        value: keriaRef.id,
      });
      await assertFails(batch4.commit());
    });
  });
});
```

---

[CC BY-SA][cc-by-sa]

[cc-by-sa]: https://creativecommons.org/licenses/by-sa/4.0/
