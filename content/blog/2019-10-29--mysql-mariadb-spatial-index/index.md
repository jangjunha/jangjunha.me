+++
title = "MySQL / MariaDB 공간 검색"
slug = "mysql-mariadb-spatial-index"
date = "2019-10-29"

[taxonomies]
tags = ["mysql", "mariadb", "database", "index", "rtree", "mbr"]

[extra]
featured = true
+++

[https://www.notion.so/MySQL-MariaDB-11eff6f9bbc34d4580c5abef84dc6276](https://www.notion.so/MySQL-MariaDB-11eff6f9bbc34d4580c5abef84dc6276)에 작성했던 글을 블로그에 다시 옮겨왔습니다.

📝 [Real MySQL 스터디](https://github.com/Leop0ld/real-mysql-study)를 진행하면서 정리한 노트입니다.

⌨️ 예제들은 MySQL 8.0을 기준으로 작성하였습니다.

## 공간 검색

**R-Tree 인덱스**를 사용. **Spatial Index** 라고도 함.

### 그 전에 B-Tree 살펴보기

- [https://ko.wikipedia.org/wiki/B\_트리](https://ko.wikipedia.org/wiki/B_%ED%8A%B8%EB%A6%AC)
- [https://hyungjoon6876.github.io/jlog/2018/07/20/btree.html](https://hyungjoon6876.github.io/jlog/2018/07/20/btree.html)

### R-Tree 요약

**MBR**(Minimum Bounding Rectangle): 요소들을 포함하는 최소 크기의 사각형

도형들을 여러 MBR들로 그룹핑하고, 또 다시 그 MBR들을 더 큰 단위의 MBR로 묶는 식으로 트리를 구성

[https://12bme.tistory.com/143](https://12bme.tistory.com/143)

### R-Tree 인덱스를 사용해야 하는 이유

- 좌표 데이터를 X좌표, Y좌표 2개 컬럼으로 만들어서 B-Tree composite 인덱스를 걸면 Left-most 특성땜에 특정 영역 범위 검색 시 한 쪽밖에 인덱스를 못 탐.
  - → 데이터의 분포에 따라서 거의 풀스캔 하다시피 하는 경우가 생길 수 있음
- 성능
  - 위치 정보 검색 시 R-Tree 인덱스가 B-Tree와 비교해서 전반적으로 검색이 빠름.
  - 단, 검색하는 영역이 너무 넓으면 느림

## R-Tree를 이용한 위치 검색

### 인덱스 생성

- `POINT` / `GEOMETRY` 타입 등 사용하여 위치 정보 저장
- MySQL 5.7, MariaDB 10.2.2 미만에서는 R-Tree 인덱스를 사용하려면 MyISAM 스토리지 엔진으로 테이블 생성
  - [MySQL 5.7](https://dev.mysql.com/doc/refman/5.7/en/mysql-nutshell.html#mysql-nutshell-additions), [MariaDB 10.2.2](https://mariadb.com/kb/en/library/spatial-index/) 부터는 InnoDB / Aria 스토리지 엔진에서도 쓸 수 있음
- 인덱스 생성 시 `SPATIAL KEY` 키워드 사용

  ```sql
  -- MySQL 8.0

  > CREATE TABLE zloc (
      id INT NOT NULL,
      loc POINT NOT NULL SRID 0,  -- MySQL 8.0 부터는 SRID를 명시하지 않으면 인덱스를 안 탐
      PRIMARY KEY (id),
      SPATIAL KEY sx_loc (loc)
    ) DEFAULT CHARSET=utf8;

  > INSERT INTO zloc (id, loc) VALUES (1, point(2, 3));
  > INSERT INTO zloc (id, loc) VALUES (2, point(4, 1));
  > INSERT INTO zloc (id, loc) VALUES (3, point(3, 2));
  ```

### 조회

MySQL 클라이언트가 `POINT` 타입을 알아서 표현해주지 않음

- [`ST_X()`](https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html#function_st-x), [`ST_Y()`](https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html#function_st-y) 함수로 점의 X, Y좌표를 가져올 수 있음 (MySQL 5.6 미만에서는 `X()`, `Y()`)
- [`ST_AsText()`](https://dev.mysql.com/doc/refman/8.0/en/gis-format-conversion-functions.html#function_st-astext)로 문자열로 나타낼 수 있음 (MySQL 5.6 미만에서는 `AsText()`)

  ```sql
  > SELECT id, ST_X(loc), ST_Y(loc), ST_AsText(loc) FROM zloc;
  +----+-----------+-----------+----------------+
  | id | ST_X(loc) | ST_Y(loc) | ST_AsText(loc) |
  +----+-----------+-----------+----------------+
  |  1 |         2 |         3 | POINT(2 3)     |
  |  2 |         4 |         1 | POINT(4 1)     |
  |  3 |         3 |         2 | POINT(3 2)     |
  +----+-----------+-----------+----------------+
  3 rows in set (0.01 sec)
  ```

### 쿼리

- [`MBRContains()`](https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-mbr.html#function_mbrcontains) 함수 사용
  - ["MBRContains() and Contains() are synonyms." (Contains is deprecated in 5.7.6)](https://dev.mysql.com/doc/refman/5.7/en/spatial-relation-functions-mbr.html#function_contains)
  - 두 번째 인자로 주어진 공간 정보의 **MBR**이 첫 번째 인자로 주어진 공간 정보의 **MBR**에 포함되는가
  - ^ 이것만이 R-Tree 인덱스를 올바르게 사용할 수 있는 유일한 방법! (인 줄 알았으나...)
- MySQL 5.6에 [`ST_Contains()`](https://dev.mysql.com/doc/refman/5.6/en/spatial-relation-functions-object-shapes.html) 함수가 생김
  - 두 번째 인자의 공간 정보가 첫 번째 인자의 공간 정보에 포함되는가 (MBR이 아님!)
  - 정확히 어떤 원리로 인덱스를 타는 건지는 찾지 못했음

{{ figure(src="img_0381-70baf40c-dccc-450e-858d-0b97b8177d5b.jpg", caption="`zloc` 테이블의 점들과 쿼리에서 사용하는 도형을 나타낸 그림") }}

### ST_Contains()

```sql
> SELECT id, ST_AsText(loc)
  FROM zloc
  WHERE ST_Contains(
    ST_GeomFromText('POLYGON((1 1,
                              4 1,
                              4 4,
                               1 1))'),
    loc
  );
+----+----------------+
| id | ST_AsText(loc) |
+----+----------------+
|  3 | POINT(3 2)     |
+----+----------------+
1 row in set (0.00 sec)

-- explain
+----+-------------+-------+------------+-------+---------------+--------+---------+------+------+----------+-------------+
| id | select_type | table | partitions | type  | possible_keys | key    | key_len | ref  | rows | filtered | Extra       |
+----+-------------+-------+------------+-------+---------------+--------+---------+------+------+----------+-------------+
|  1 | SIMPLE      | zloc  | NULL       | range | sx_loc        | sx_loc | 34      | NULL |    3 |   100.00 | Using where |
+----+-------------+-------+------------+-------+---------------+--------+---------+------+------+----------+-------------+
1 row in set, 1 warning (0.00 sec)
```

### MBRContains()

```sql
> SELECT id, ST_AsText(loc)
  FROM zloc
  WHERE MBRContains(
    ST_GeomFromText('POLYGON((1 1,
                              4 1,
                              4 4,
                              1 1))'),
    loc
  );
+----+----------------+
| id | ST_AsText(loc) |
+----+----------------+
|  1 | POINT(2 3)     |
|  3 | POINT(3 2)     |
+----+----------------+
2 rows in set (0.00 sec)

-- explain
+----+-------------+-------+------------+-------+---------------+--------+---------+------+------+----------+-------------+
| id | select_type | table | partitions | type  | possible_keys | key    | key_len | ref  | rows | filtered | Extra       |
+----+-------------+-------+------------+-------+---------------+--------+---------+------+------+----------+-------------+
|  1 | SIMPLE      | zloc  | NULL       | range | sx_loc        | sx_loc | 34      | NULL |    3 |   100.00 | Using where |
+----+-------------+-------+------------+-------+---------------+--------+---------+------+------+----------+-------------+
1 row in set, 1 warning (0.00 sec)
```

### SRID (Spatial Reference System Identifier)

- **평면 좌표(Cartesian)** 👉 SRID `0`
- **둥근 지구 (위경도) 좌표(geographic)** 👉 SRID `4326`

- [https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html](https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html)
- [https://dev.mysql.com/doc/refman/8.0/en/spatial-index-optimization.html](https://dev.mysql.com/doc/refman/8.0/en/spatial-index-optimization.html)
- [https://postgis.net/workshops/postgis-intro/projection.html](https://postgis.net/workshops/postgis-intro/projection.html)
- [https://en.wikipedia.org/wiki/Spatial_reference_system](https://en.wikipedia.org/wiki/Spatial_reference_system)
