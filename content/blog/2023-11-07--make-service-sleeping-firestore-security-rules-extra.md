+++
title = "Firestore 보안 규칙 기타 예제"
description = "앞서 다루지 않았던 몇몇 Firestore 보안 규칙 예제를 소개합니다."
date = "2023-11-07"

[taxonomies]
tags = ["serverless", "firebase", "firestore", "gcp"]

[extra]
featured = true
+++

## 목록 쿼리 제한하기

Firebase는 사용량에 따라 비용이 발생합니다. 목록 쿼리의 경우 스캔한 문서 수만큼 과금됩니다. 악의적 사용자가 한번에 많은 데이터를 불러오지 않도록 제한할 필요가 있습니다.

```rules,hl_lines=8
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      match /timetables/{timetableId} {
        allow list:
             request.query.limit is int
          && request.query.limit <= 20;
      }
    }
  }
}
```

조금 더 자세한 내용은 공식 문서의 [대규모 결과 집합 관리][firestore-pricing-large-result-sets]를 참고하면 좋습니다.

## 공개 설정 반영하기

문서에 `visibility` 필드를 만들고 보안 규칙에서 이에 접근해 구현할 수 있습니다.

```rules,hl_lines=10
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      function owner() {
        return request.auth != null && request.auth.uid == userId;
      }
      match /timetables/{timetableId} {
        function ownerOrVisible() {
          return owner() || resource.data.visibility == 'public';
        }
        allow get: if ownerOrVisible();
        allow list: if ownerOrVisible();
      }
    }
  }
}
```

## 회고

**정말 보안에 직결된 또는 다른 사용자에게 악영향을 끼칠 수 있는 규칙만 작성해도 되지 않았을까?**

이번 작업을 하면서 기존 애플리케이션에 있었던 검증 로직들을 보안 규칙으로 옮겨보았습니다. 어떤 로직은 쉽게 옮길 수 있었지만 어떤 로직은 보안 규칙을 통한 구현이 어렵기도 했습니다.

기존 데이터 검증 절차를 모두 보안 규칙으로 옮겨 구현할 필요는 없었던 것 같다는 생각이 들었습니다. 어떤 것들은 클라이언트 검증 로직만으로 충분했을 것입니다. 예를 들면 공격자가 자신의 시간표 제목 필드를 지운 뒤 사이트에 접근해서 생기는 오류를 보안 규칙을 통해 막을 필요는 없었을 것 같습니다.

하지만 한편으로는 촘촘한 검증 보안 규칙들이 클라이언트 작업자의 실수로 인한 문제를 방지할 수 있었을 것입니다. 오류가 보고됐을 때 실수로 인한 건지 공격으로 인한 건지 구분해야 할 일이 줄어들테니 말입니다.

{{ make_service_sleeping_list() }}

[firestore-pricing-large-result-sets]: https://firebase.google.com/docs/firestore/pricing?hl=ko#large-result-sets
