+++
title = "DB 스키마에 대응하는 Firestore 스키마 정의하기"
description = "이전에 관계형 데이터베이스(RDB)에 저장했던 데이터를 Firestore에 어떻게 저장했는지 살펴봅니다."
date = "2022-11-06"

[taxonomies]
tags = ["serverless", "firebase", "firestore", "gcp"]

[extra]
featured = true
+++

계획대로라면 서비스를 이전하는 데 문제가 없을 것 같지만 항상 문제는 생기기 마련입니다. 미처 생각하지 못했던 문제가 있지는 않은지 검증하기 위해서 웹사이트를 먼저 Firebase 기반으로 이전해보기로 했습니다. 그 첫 단계로 이전에 관계형 데이터베이스(RDB)에 저장했던 데이터를 Firestore에 어떻게 저장했는지 살펴보겠습니다.

## 기존 스키마 살펴보기

<div class="not-prose">
<pre class="mermaid">
erDiagram
  School ||--o{ Semester : ""
  School {
		string id PK
		string name
  }
	Semester {
		string id PK
		string school_id FK
		integer year
		string term
		json periods
    string lectures_url
	}
  User ||--o{ Timetable : has
	User {
		uuid id PK
		string username
		string password
    datetime created_at
    datetime updated_at
	}
	Timetable ||--o{ Lecture : contains
  Timetable }o..|| Semester : ""
  Timetable {
		uuid id PK
		string title
		uuid user_id FK
		uuid semester_id FK
    datetime created_at
    datetime updated_at
  }
  Lecture ||--o{ LectureTime : contains
  Lecture {
		uuid id PK
		string identifier
		string title
		string professor
		decimal credit
		json category
		uuid timetable_id FK
    datetime created_at
    datetime updated_at
	}
  LectureTime {
		uuid id PK
		integer weekday "0:월요일 - 6:일요일"
		integer time_begin "540:9am"
		integer time_end
		string room
		uuid lecture_id FK
    datetime created_at
    datetime updated_at
  }
</pre>
</div>

중심이 되는 테이블은 `Timetable`입니다. `User`는 여러 `Timetable`을 만들 수 있고, `Timetable`에 여러 `Lecture`를 추가할 수 있습니다. 그리고 다시 `Lecture`는 여러 `LectureTime`으로 구성돼있습니다.

아래는 시간표 하나를 저장하고 있는 테이블들을 나타낸 예시입니다. 몇몇 필드는 생략했고, UUID는 너무 길어서 축약했습니다.

<div class="[&_code_strong]:bg-tint-200">

**Timetable**

| id           | title            | user_id      | semester_id                |
| ------------ | ---------------- | ------------ | -------------------------- |
| 7b8a38af69bf | 1교시엔 잠을자자 | c96c5ddff0da | korea_univ_anam/2022-2학기 |

**Lecture**

| id           | identifier | title              | professor | credit | category                   | timetable_id |
| ------------ | ---------- | ------------------ | --------- | ------ | -------------------------- | ------------ |
| 62a81f025dd4 | COSE372    | 데이터베이스시스템 | 정연돈    | 3.0    | ["정보대학", "컴퓨터학과"] | 7b8a38af69bf |
| 0128d5638268 | COSE474    | 전산학특강         | 정원기    | 3.0    | ["정보대학", "컴퓨터학과"] | 7b8a38af69bf |

**LectureTime**

| id           | weekday | time_begin  | time_end    | room        | lecture_id   |
| ------------ | ------- | ----------- | ----------- | ----------- | ------------ |
| 1b842dd209df | 1 (화)  | 630 (10:30) | 705 (11:45) | 정보관 202  | 62a81f025dd4 |
| 2d9f1a2a520b | 3 (목)  | 630 (10:30) | 705 (11:45) | 정보관 202  | 62a81f025dd4 |
| ecad3e3edb1b | 1 (화)  | 840 (14:00) | 915 (15:15) | 정보관 B101 | 0128d5638268 |
| 8ee85e9365a0 | 3 (목)  | 840 (14:00) | 915 (15:15) | 정보관 B101 | 0128d5638268 |

## Firestore 구조에 맞는 새 스키마

Firestore는 문서 기반의 NoSQL 데이터베이스입니다. Firestore 데이터베이스 아래에는 여러 컬렉션들이 있습니다. 컬렉션은 문서들의 집합이고 ID를 가집니다. 예를들면 HeekTime에는 학교 문서의 집합인 `/schools` 컬렉션이 있습니다. 컬렉션 아래에는 여러 문서들이 있습니다.

각 문서 역시 ID를 가지고 키-값 쌍으로 이루어진 내용을 가집니다(다른 문서 기반의 DB들이 JSON 형태의 값을 내용으로 가지듯이). 값에는 `string`, `number`, `boolean`, `map`, `array`, `null`, `timestamp`, `geopoint`, `reference` 타입이 올 수 있습니다. (문서의 내용을 `map` 타입이라고 봐도 무리는 없을겁니다.) `/schools` 컬렉션 아래에 "고려대학교-서울" 이라는 ID를 가진 문서를 만들 수 있을 겁니다. 이 문서의 경로(path)는 `/schools/고려대학교-서울`이 됩니다.

그리고 문서 아래에는 다시 하위 컬렉션이 있을 수 있고 그 아래에는 다시 하위 문서를 둘 수 있습니다. 관계형 DB는 아니지만 이처럼 부모-자식 관계는 존재합니다. 컬렉션의 자식은 항상 문서이고, 문서의 부모는 항상 컬렉션입니다. 경로로 살펴보면 `/컬렉션/문서/컬렉션/문서`와 같은 형태로 컬렉션과 문서가 교차로 나타납니다.

Firestore에 대한 설명은 이만하고 다시 HeekTime 스키마로 돌아가보겠습니다. Firestore에 대한 보다 자세한 설명을 원하시면 [Cloud Firestore 문서](cloud firestore 문서)를 참고해주세요. 아래에 Firestore로 저장한 HeekTime 데이터를 간단한 탐색기를 통해 볼 수 있게 해두었습니다. 데이터도 아주 조금 더 넣어두었습니다. 위에서 예시로 들었던 시간표는 `/users/c96c5ddff0da/timetables/7b8a38af69bf` 경로에 있으니 참고해주세요.

<div id="explorer" class="not-prose"></div>

<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script type="text/javascript">
const container = document.querySelector('#explorer');
const root = ReactDOM.createRoot(container);
const e = React.createElement;
const useState = React.useState;
const useCallback = React.useCallback;
const useMemo = React.useMemo;
const database = {
	collections: {
		users: {
			c96c5ddff0da: {
				data: {
					username: ["jangjunha", "string"],
					createdAt: ["2022-09-17T02:34+09:00", "timestamp"],
					updatedAt: ["2022-09-17T02:34+09:00", "timestamp"],
				},
				collections: {
					timetables: {
						"7b8a38af69bf": {
							data: {
								title: ["1교시엔 잠을자자", "string"],
								semester: ["/schools/고려대학교-서울/semesters/2022-0900", "reference"],
								createdAt: ["2022-09-17T02:34+09:00", "timestamp"],
								updatedAt: ["2022-09-17T02:34+09:00", "timestamp"],
							},
							collections: {
								lectures: {
									"62a81f025dd4": {
										data: {
											identifier: ["COSE372", "string"],
											title: ["데이터베이스시스템", "string"],
											professor: ["정연돈", "string"],
											credit: ["3", "number"],
											category: [[["정보대학", "string"], ["컴퓨터학과", "string"]], "array"],
											times: [[
												[{
													weekday: [0, "number"],
													timeBegin: [630, "number"],
													timeEnd: [705, "number"],
													room: ["정보관 202", "string"],
												}, "map"],
												[{
													weekday: [2, "number"],
													timeBegin: [630, "number"],
													timeEnd: [705, "number"],
													room: ["정보관 202", "string"],
												}, "map"],
											], "array"],
											createdAt: ["2022-09-17T02:34+09:00", "timestamp"],
											updatedAt: ["2022-09-17T02:34+09:00", "timestamp"],
										},
									},
									"0128d5638268": {
										data: {
											identifier: ["COSE474", "string"],
											title: ["전산학특강", "string"],
											professor: ["정원기", "string"],
											credit: ["3", "number"],
											category: [[["정보대학", "string"], ["컴퓨터학과", "string"]], "array"],
											times: [[
												[{
													weekday: [0, "number"],
													timeBegin: [840, "number"],
													timeEnd: [915, "number"],
													room: ["정보관 B101", "string"],
												}, "map"],
												[{
													weekday: [2, "number"],
													timeBegin: [840, "number"],
													timeEnd: [915, "number"],
													room: ["정보관 B101", "string"],
												}, "map"],
											], "array"],
											createdAt: ["2022-09-17T02:49+09:00", "timestamp"],
											updatedAt: ["2022-09-17T02:49+09:00", "timestamp"],
										},
									},
								},
							},
						},
						"8d2e6cdc9a4b": {
							data: {
								title: ["시간표 2안", "string"],
								semester: ["/schools/고려대학교-서울/semesters/2022-0900", "reference"],
								createdAt: ["2022-09-17T03:00+09:00", "timestamp"],
								updatedAt: ["2022-09-17T02:00+09:00", "timestamp"],
							},
							collections: {
								lectures: {
									"b6667a9063df": {
										data: {
											identifier: ["KECE456", "string"],
											title: ["코드및시스템최적화", "string"],
											professor: ["김선욱", "string"],
											credit: ["3", "number"],
											category: [[["공과대학", "string"], ["전기전자공학부", "string"]], "array"],
											times: [[
												[{
													weekday: [0, "number"],
													timeBegin: [630, "number"],
													timeEnd: [705, "number"],
													room: ["공학관 366", "string"],
												}, "map"],
												[{
													weekday: [2, "number"],
													timeBegin: [630, "number"],
													timeEnd: [705, "number"],
													room: ["공학관 366", "string"],
												}, "map"],
											], "array"],
											createdAt: ["2022-09-17T03:10+09:00", "timestamp"],
											updatedAt: ["2022-09-17T03:10+09:00", "timestamp"],
										},
									},
									"0128d5638268": {
										data: {
											identifier: ["COSE474", "string"],
											title: ["전산학특강", "string"],
											professor: ["정원기", "string"],
											credit: ["3", "number"],
											category: [[["정보대학", "string"], ["컴퓨터학과", "string"]], "array"],
											times: [[
												[{
													weekday: [0, "number"],
													timeBegin: [840, "number"],
													timeEnd: [915, "number"],
													room: ["정보관 B101", "string"],
												}, "map"],
												[{
													weekday: [2, "number"],
													timeBegin: [840, "number"],
													timeEnd: [915, "number"],
													room: ["정보관 B101", "string"],
												}, "map"],
											], "array"],
											createdAt: ["2022-09-17T03:00+09:00", "timestamp"],
											updatedAt: ["2022-09-17T03:00+09:00", "timestamp"],
										},
									},
								},
							},
						},
					},
				},
			},
			e2eb1e9d2e6a: {
				data: {
					username: ["dlwlrma", "string"],
					createdAt: ["2022-11-06T14:38+09:00", "timestamp"],
					updatedAt: ["2022-11-06T14:38+09:00", "timestamp"],
				},
				collections: {
					timetables: {
					},
				},
			},
		},
		schools: {
			"고려대학교-서울": {
				data: {
					name: ["고려대학교 (서울)", "string"],
				},
				collections: {
					semesters: {
						"2022-0900": {
							data: {
								year: ["2022", "number"],
								term: ["2학기", "string"],
								periods: [[
									[{
										period: [1, "number"],
										timeBegin: [540, "number"],
										timeEnd: [615, "number"],
									}, "map"], [{
										period: [2, "number"],
										timeBegin: [630, "number"],
										timeEnd: [705, "number"],
									}, "map"], [{
										period: [3, "number"],
										timeBegin: [720, "number"],
										timeEnd: [770, "number"],
									}, "map"], [{
										period: [4, "number"],
										timeBegin: [780, "number"],
										timeEnd: [830, "number"],
									}, "map"], [{
										period: [5, "number"],
										timeBegin: [840, "number"],
										timeEnd: [915, "number"],
									}, "map"],
								], "array"],
								lecturesUrl: ["gs://heektime/5655b5e.json", "string"],
							},
						},
					},
				},
			},
		},
		indices: {
			user: {
				collections: {
					usernames: {
						jangjunha: {
							data: {
								username: ["c96c5ddff0da", "string"],
							},
						},
						dlwlrma: {
							data: {
								username: ["e2eb1e9d2e6a", "string"],
							},
						},
					},
				},
			},
		},
	},
};
const Field = ({ name, value, type }) => (
	e(
		"tr",
		{},
		e("td", { className: "flex text-slate-500 sm:break-keep" }, `${name}:`),
		e("td", {}, e(Value, { value, type })),
	)
);
const MappingElement = ({ name, value, type }) => (
	e("tr", {},
		e("td", { className: "flex text-slate-500 sm:break-keep" }, e("code", {}, `${name}:`)),
		e("td", {}, e(Value, { value, type })),
	)
);
const Value = ({ value, type }) => {
	const typeTag = e(
		"span",
		{ className: "ml-2 text-gray-400" },
		`(${type})`,
	);
	switch (type) {
		case "string":
		case "number":
		case "boolean":
		case "geopoint":
			return e("div", { className: "flex flex-wrap" },
				e("code", {}, JSON.stringify(value, null, 2)),
				typeTag,
			);
		case "timestamp":
		case "reference":
			return e("div", { className: "flex flex-wrap" },
				e("code", {}, value),
				typeTag,
			);
		case "null":
			return e("code", {}, "null");
		case "map":
			return e("div", { className: "" },
				e("code", {}, "{"),
				e(
					"table", { className: "table-auto ml-4 sm:ml-8" },
					e("tbody", {}, Object.entries(value).map(([name, [ev, et]]) => (
						e(MappingElement, { key: name, name, value: ev, type: et })
					))),
				),
				e("code", {}, "}"),
				typeTag,
			);
		case "array":
			return e("div", { className: "" },
				e("code", {}, "["),
				e(
					"ul", { className: "ml-4 sm:ml-8" },
					value.map(([ev, et], index) => (
						e(Value, { key: index, value: ev, type: et })
					)),
				),
				e("code", {}, "]"),
				typeTag,
			);
	}
};
const Document = ({ data: doc }) => (
	e(
		"div",
		{ className: "flex-auto" },
		e(
			"table",
			{ className: "table-auto m-4" },
			e(
				"tbody", {},
				Object.entries(doc).map(([k, v]) => e(
					Field,
					{ key: k, name: k, value: v[0], type: v[1] },
				))
			),
		),
	)
);
const Path = ({ path, onClick }) => (
	e(
		"div", { className: "flex flex-wrap border-b px-4 py-2" },
		path.reduce((res, e) => [[e, ...res[0]], ...res], [[null]]).reverse().map((elem) => {
			const p = elem.slice(0, -1).reverse();
			const fullPath = "/" + p.join("/");
			return e(
				React.Fragment,
				{ key: fullPath },
				e("span", { className: "px-[0.25rem] first:pl-0 text-tint-300" }, "/"),
				e(
					"span", {
						className: "underline cursor-pointer text-tint-600",
						onClick: () => onClick(p),
					},
					elem[0] || "(database)",
				),
			);
		}),
	)
);
const Column = ({ data, type, children, onClick }) => (
	e(
		"div", { className: "grow flex flex-col sm:flex-row-reverse items-stretch" },
		e("div", { className: "sm:w-[9.5rem] sm:border-l bg-slate-100 pb-2 sm:pb-0 border-b sm:border-b-0" },
			e(
				"div",
				{ className: "px-2 pt-2 pb-0 text-slate-500 text-sm" },
				type === "document" ? "하위 컬렉션" : "하위 문서",
			),
			children.length > 0 ? e(
				"ul",
				{ className: "flex flex-col border-t bg-white" },
				...children.map((item) => e(
					"li",
					{ key: item, className: "border-b pl-4 pr-2 py-1 cursor-pointer hover:bg-tint-100", onClick: () => onClick(item) },
					item,
				)),
			) : e("span", { className: "px-2 text-slate-300 text-sm" }, "(empty)"),
		),
		data ? e(Document, { data }) : e("p", { className: "grow p-4 text-slate-500" }, type === "document" ? "오른쪽 사이드바에서 하위 컬렉션을 탐색해보세요." : children.length > 0 ? "오른쪽 사이드바에서 하위 문서를 탐색해보세요." : "여기에는 하위 문서가 없습니다."),
	)
);
const Explorer = () => {
	const [path, setPath] = useState([]);
	const last = useMemo(() => {
		var res = [["document", [], database]];
		for (const p of path) {
			const [currType, currPath, curr] = res[0];
			const nextPath = [...currPath, p];
			switch (currType) {
			case "document":
				res.unshift(["collection", nextPath, curr.collections[p]]);
				break;
			case "collection":
				res.unshift(["document", nextPath, curr[p]]);
				break;
			}
		};
		return res[0];
	}, [path]);
	const [lastType, lastPath, lastItem] = last;
	const handleClickItem = useCallback((name) => setPath([...path, name]), [path.join("/")]);
	return e(
		"div",
		{ className: "flex flex-col items-stretch min-h-[20rem] border" },
		e(Path, { path: lastPath, onClick: setPath }),
		e(
			Column,
			{ data: lastItem.data, type: lastType, onClick: handleClickItem },
			Object.keys(lastType === "document" ? lastItem.collections || [] : lastItem),
		),
	);
};
root.render(e(Explorer));
</script>

<!--

**School** <code>/schools/**고려대학교-서울**</code>

| Field | Value             | Type   |
| ----- | ----------------- | ------ |
| name  | 고려대학교 (서울) | string |

**Semester** <code>/schools/**고려대학교-서울**/semesters/**2022-0900**</code>

| Field       | Value                      | Type   |
| ----------- | -------------------------- | ------ |
| year        | 2022                       | number |
| term        | 2학기                      | string |
| periods     | […]                        | array  |
| lecturesUrl | gs://heektime/5655b5e.json | string |

**User** <code>/users/**c96c5ddff0da**</code>

| Field     | Value                  | Type      |
| --------- | ---------------------- | --------- |
| username  | jangjunha              | string    |
| createdAt | 2022-09-17T02:34+09:00 | timestamp |
| updatedAt | 2022-09-17T02:34+09:00 | timestamp |

**Timetable** <code>/users/**c96c5ddff0da**/timetables/**7b8a38af69bf**</code>

| Field     | Value                                        | Type      |
| --------- | -------------------------------------------- | --------- |
| title     | 1교시엔 잠을자자                             | string    |
| semester  | /schools/고려대학교-서울/semesters/2022-0900 | reference |
| createdAt | 2022-09-17T02:34+09:00                       | timestamp |
| updatedAt | 2022-09-17T02:34+09:00                       | timestamp |

**Lecture** <code>/users/**c96c5ddff0da**/timetables/**7b8a38af69bf**/lectures/**62a81f025dd4**</code>

<table>
  <thead>
    <tr>
      <th>Field</th>
	  <th>Value</th>
	  <th>Type</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>identifier</td><td>COSE372</td><td>string</td></tr>
    <tr><td>title</td><td>데이터베이스시스템</td><td>string</td></tr>
    <tr><td>professor</td><td>정연돈</td><td>string</td></tr>
    <tr><td>credit</td><td>3</td><td>number</td></tr>
    <tr>
      <td>category</td>
      <td>
        <code>[<br />
        &nbsp;&nbsp;&nbsp;&nbsp;"정보대학" (string)<br />
        &nbsp;&nbsp;&nbsp;&nbsp;"컴퓨터학과" (string)<br />
        ]</code>
	  </td>
	  <td>array</td>
	</tr>
	<tr>
	  <td>times</td>
	  <td>
	    <code>[<br />
        &nbsp;&nbsp;&nbsp;&nbsp;{<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"weekday": 0 (number)<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"timeBegin": 630 (number)<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"timeEnd": 705 (number)<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"room": "정보관 202" (string)<br />
        &nbsp;&nbsp;&nbsp;&nbsp;} (map)<br />
        &nbsp;&nbsp;&nbsp;&nbsp;{<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"weekday": 2 (number)<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"timeBegin": 630 (number)<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"timeEnd": 705 (number)<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"room": "정보관 202" (string)<br />
        &nbsp;&nbsp;&nbsp;&nbsp;} (map)<br />
        ]</code>
      </td>
	  <td>array</td>
	</tr>
    <tr><td>createdAt</td><td>2022-09-17T02:34+09:00</td><td>timestamp</td></tr>
    <tr><td>updatedAt</td><td>2022-09-17T02:34+09:00</td><td>timestamp</td></tr>
  </tbody>
</table>

**Username Index** <code>/indices/**user**/usernames/**jangjunha**</code>

| Field    | Value        | Type   |
| -------- | ------------ | ------ |
| username | c96c5ddff0da | string |

-->

</div>

크게 달라진 부분은 없지만 Firestore의 구조에 알맞게 몇몇 부분을 변경했습니다. 눈여겨 볼만한 부분을 살펴볼까요?

- 이제는 Lecture 문서가 Timetable 문서 **하위**에 있기 때문에 `timetable_id`를 가리키는 필드는 더이상 필요하지 않습니다. 마찬가지로 Timetable 문서는 User 문서 **하위**에 있기 때문에 `user_id`를 가리키는 필드도 필요하지 않습니다.

- 강의시간 정보를 별도의 (LectureTime)컬렉션 대신 Lectue 문서 필드의 값으로 저장합니다.

  → 강의정보 없이 강의시간 정보만 따로 불러올 일이 없는 상황에서 Firestore는 문서 접근에 따른 요금 부과 체계가 있기 때문에 별도 문서로 저장하기보다는 복합 객체 값으로 저장하도록 했습니다.

- 참고로 Lecture 문서의 category, times 필드는 JSON이 아닌 복합 객체 타입입니다.

- username의 고유성을 보장하기 위해 Username Index 컬렉션(`/indices/user/usernames`)을 새로 만들었습니다.

  RDB와 달리 Firestore에서는 특정 필드에 고유 제약조건을 걸 수 없어 다른 방법을 이용해야합니다. Firestore의 특정 컬렉션 내에서 문서 ID는 고유합니다. 이러한 특성을 이용하기 위해서 별도의 username 컬렉션을 만듭니다. 이 컬렉션과 트랜잭션을 사용해서 username의 고유성을 유지하면서 User를 생성하거나 변경할 수 있고, 보안 규칙을 사용해서 이를 강제할 수 있습니다. 보안 규칙에 대한 내용은 후속편에서 다뤄보겠습니다. <!-- 참고한 질문-답변: Brian Neisler, [https://stackoverflow.com/a/59892127](https://stackoverflow.com/a/59892127) -->

- User의 인증 정보는 이제 별개의 서비스(Firebase Authentication)에서 관리하기 때문에 password 해시를 여기서 저장하지 않습니다.

<aside class="bg-tint-200 px-6 rounded-3xl flex flex-row gap-4">
<div><p>✏️</p></div>
<div class="flex-auto">

앞서서 이야기했듯이 Firestore는 **문서 기반의 NoSQL 데이터베이스**입니다. RDB에서 한 테이블에 속한 레코드들은 같은 형식을 따르지만 Firestore의 한 컬렉션(collection)에 속한 문서(document)들은 같은 형식을 따르지 않아도 됩니다. 다시 말해서 앞서 정의한 **스키마가 강제되지는 않습니다.** 이를테면 시간표 문서의 title 필드는 string 타입으로 정했지만 number 타입의 값을 지정해도 Firestore에서 오류가 발생하지는 않습니다. 단지 사용자가 정하고 따르는 규칙일 뿐입니다. 하지만 Firestore 보안 규칙을 이용하면 사용자 요청을 검증하면서 필드 타입을 강제할 수 있는데 이 내용은 뒤에서 다루겠습니다. (하지만 보안 규칙을 사용해도 Firebase Console이나 Admin SDK를 통해서는 여전히 다른 필드 타입을 적용할 수 있습니다.)

</div>
</aside>

이제 웹사이트를 옮겨 볼 준비를 마쳤습니다. 다음 글에서는 웹사이트가 기존 서버에 HTTP 요청을 날리는 대신 Firestore SDK를 사용해도록 변경해보고 문제없이 작동하는지 확인해보도록 하겠습니다.

{{ make_service_sleeping_list() }}

[cloud firestore 문서]: https://firebase.google.com/docs/firestore?hl=en
