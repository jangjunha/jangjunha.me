+++
title = "Flask 애플리케이션 배포 A to Z"
slug = "flask-deployment"
date = "2017-06-28"

[taxonomies]
tags = ["flask", "deployment"]

[extra]
featured = true
+++

선린인터넷고등학교 Python Web framework 소수전공을 진행하면서 시간이 부족해 다루지 못했던 배포 파트를 정리해두었던 문서입니다.
만든 Flask 애플리케이션을 (가상머신 위에서) 실제 서비스처럼 구동시키는 것을 목표로 했습니다.

## 사용 환경

- Ubuntu Server 16.04 LTS
- Nginx
- uwsgi (2.x)

## 배포하기

### Flask 설정 확인하기

앱을 배포하기 전에 설정을 다시 한번 점검해야합니다. SECRET_KEY가 GitHub와 같은 public repository에 올라가 공개되거나 너무 간단해 공격자가 유추해낸다면 공격자가 세션을 읽거나 조작할 수 있습니다. 다른 예로 Flask의 debug 모드가 켜져있으면 소스 코드가 노출되거나 (지금은 PIN code를 입력 절차가 추가됐지만) python shell에 접근할 수 있습니다.

`app.config['KEY'] = 'value'`와 같이 설정했던 config를 별도의 파일로 분리해서 관리해보겠습니다. 여러 환경에 따라 각각 다른 설정이 필요하다면 앱 기본 설정 값과 배포 환경(로컬 개발 환경, 테스트 환경, Release)별로 설을 나누는 방법으로 관리할 수 있습니다.
SECRET_KEY는 python shell에서 `os.urandom(24)`을 입력해 출력되는 값을 복사해 붙여넣어봅시다.[^1] 데이터베이스 파일은 `/tmp` 디렉토리에 생성하겠습니다.

**satcounter_config.py**

```
SECRET_KEY = '쉽게 유추할 수 없는 키. 유출되면 안됩니다.'
SQLALCHEMY_DATABASE_URI = 'sqlite:////tmp/test.db'
```

그리고 위의 파일을 config로 설정하도록 애플리케이션에 다음 코드를 추가합니다.

**application.py (Flask app 소스파일)**

```python
app.config.from_object('satcounter_config')
```

[^1]: [Flask 공식 문서: How to generate good secret keys](https://flask.palletsprojects.com/en/0.12.x/quickstart/)

### 원격 저장소에 소스 코드 올리기

만든 Flask 애플리케이션을 서버에서 구동시키려면 소스 코드를 서버에 옮겨야합니다. 많은 경우 git을 사용하여 소스코드 버전 관리를 하므로 원격 저장소에서 서버로 소스 코드를 clone 받겠습니다.  
그 전에 지금까지 작성한 소스 코드를 git을 사용해서 원격 저장소(GitHub)에 올리는 방법을 간단하게 설명하겠습니다. git에 대한 설명은 최소한으로만 할 테니 git을 공부하실 분은 다른 문서를 보면서 공부해주세요. 간단한 git 사용법은 <https://rogerdudler.github.io/git-guide/index.ko.html> 이 문서를 추천드립니다.

#### .gitignore 파일 만들기

git으로 버전 관리를 하지 않을 파일들을 설정합니다. 컴파일 된 파이썬 파일(\*.pyc), Virtualenv 디렉토리, OS 임시 파일, SQLite DB 등을 제외하도록 설정합니다. <https://www.gitignore.io> 같은 사이트를 사용하면 편리하게 생성할 수 있습니다.

[예시(Python, Virtualenv, Windows)](https://www.gitignore.io/api/python%2Cvirtualenv%2Cwindows)

위 링크(gitignore.io)에서 생성한 리스트를 .gitignore 파일에 추가하고, SQLite DB와 SECRET_KEY가 포함된 설정파일도 제외하도록 다음을 추가합니다.

```
*.db
satcounter_config.py
```

#### git 클라이언트 설치하기

Windows의 경우 <https://git-scm.com/download/win>에서 git 클라이언트를 다운받아 설치합니다. GitHub Desktop이나 SourceTree와 같은 GUI 툴을 사용해도 무방하나 설명은 커맨드 기준으로 하겠습니다.

#### git (로컬) 저장소 만들기

프로젝트 폴더에서 다음 명령을 실행하여 git 저장소를 초기화합니다.

```bash
git init
```

`.git`폴더가 만들어졌을겁니다. (윈도우 탐색기 기본 설정에서는 보이지 않을 수 있습니다. )

#### git commit 만들기

`git status` 명령으로 현재 상태를 확인할 수 있습니다. 아직 commit을 한 적이 없다면 Untracked files만 확인할 수 있을겁니다. 여기서 버전을 관리할(원격 저장소에 올릴) 파일과 디렉토리를 `git add` 명령으로 stage 영역에 추가합니다. 변경 사항을 모두 커밋하고 싶다면(제외할 파일이 없다면) 다음과 같이 `git add --all` 명령으로 모두 추가할 수 있습니다.

```bash
git add --all
```

stage 영역에 변경한 파일들을 추가했으면 확정본(commit)을 만들어야합니다. 다음 명령으로 commit을 만듭니다. 버전 관리는 기본적으로 commit 단위로 하게됩니다. (이전의 특정 commit으로 소스 코드를 돌릴 수 있습니다.) -m 옵션에는 commit 메시지를 적는데 변경 내용을 간략하게 적어봅시다.

```bash
git commit -m "커밋 메시지"
```

#### 원격 저장소 만들고 로컬 저장소에 설정하기

GitHub에 로그인 하고 New Repository 버튼을 눌러 원격 저장소를 만듭니다. Public 옵션으로 만들면 다른 모든 사람들이 GitHub에서 소스 코드를 볼 수 있습니다. Private 옵션은 유료입니다.
[Bitbucket](https://bitbucket.org/), [GitLab](https://about.gitlab.com/)과 같은 서비스도 있습니다. 여기서는 GitHub 기준으로 설명합니다.

원격 저장소를 만들었으면 현재 프로젝트에 원격 저장소를 추가해야합니다. 다음 명령으로 GitHub에서 만든 원격 저장소를 origin이라는 이름으로 추가할 수 있습니다. 주소는 방금 생성된 repository 페이지에 Quick setup 박스에서 확인할 수 있습니다.

```bash
git remote add origin https://github.com/<username>/<reponame>.git
```

#### commit을 원격 저장소에 올리기

```bash
git push origin master
```

GitHub repository 페이지를 새로고침하면 올라간 소스 코드를 확인할 수 있습니다!

### 서버에 패키지 설치하기

서버에 패키지를 설치하기 전에 리스트를 업데이트합니다.

```bash
sudo apt-get update
```

서버에 필요한 패키지들을 설치합니다.

```bash
sudo apt-get install nginx uwsgi python-pip virtualenv uwsgi-plugin-python3 git
```

| 패키지               | 설명                                                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nginx                | HTTP 서버. Apache(httpd)와 같은 다른 HTTP 서버를 사용해도 무방하나 이 문서에서는 nginx를 사용해 설정하는 법을 설명                                               |
| uwsgi[^2]            | 만든 Flask 애플리케이션을 구동할 애플리케이션 서버. 개발 단계에서는 Flask에 내장된 build-in 서버를 사용했지만 배포 할 때는 uwsgi와 같은 애플리케이션 서버를 사용 |
| python-pip           | Python 패키지 매니저. Flask 등 Python 패키지를 설치할 때 사용                                                                                                    |
| virtualenv           | 가상의 독립된 Python 환경을 구성해주는 툴                                                                                                                        |
| uwsgi-plugin-python3 | uwsgi에서 python3 애플리케이션을 돌리기 위한 플러그인                                                                                                            |
| git                  | 소스코드 버전 관리 시스템. git을 사용해서 앱을 배포 할 서버에 소스를 받을 예정                                                                                   |

[^2]: [Flask 공식 문서: uWSGI에 배포하기](https://flask.palletsprojects.com/en/0.12.x/deploying/uwsgi)

### 원격 저장소에서 코드 내려받기

서버에 소스 코드를 내려받아야합니다. 원격 저장소 주소는 아까 그... 주소입니다. repository 페이지의 Clone or download 버튼을 누르면 주소를 확인하실 수 있습니다. Private repository를 사용중이라면 추가 인증이 요구될 수 있습니다.

```bash
git clone <원격 저장소 주소>
```

repository 이름으로 프로젝트 디렉토리가 만들어졌을겁니다.

### Virtualenv 만들기

virtualenv을 이용해 가상환경을 만들어 사용하겠습니다. 저희 프로젝트는 python3을 사용하므로 python3을 사용하도록 추가 옵션을 주겠습니다.

```bash
virtualenv venv -p python3
```

activate는 다음과 같이 합니다. activate 되면 프롬프트 앞에 (venv)와 같이 virtualenv의 이름이 뜹니다.

```
$ source venv/bin/activate
(venv)$
```

deactivate는 다음과 같이 합니다.

```
(venv)$ deactivate
$
```

### (Virtualenv에) 파이썬 패키지 설치하기

프로젝트에 사용하는 파이썬 패키지들을 설치합니다. virtualenv를 사용한다면 activate 후에 설치합니다.

```
(venv)$ pip install Flask Flask-SQLAlchemy
```

#### 패키지 관리 팁

일반적으로 파이썬 프로젝트에서는 `requirements.txt`에 사용하는 패키지명들을 기록해둡니다. `requirements.txt`에 의존 패키지들을 기록해두면 프로젝트 소스코드를 새로 받았거나 의존 패키지 버전에 변화가 있을 때 다음 명령어로 간단하게 설치할 수 있습니다.

```
(venv)$ pip install -U -r requirements.txt
```

현재 설치된 패키지들을 모두 `requirements.txt`에 기록하려면 다음 명령을 사용하면 됩니다.

```
(venv)$ pip freeze > requirements.txt
```

### DB 생성 · 설정하기

#### DB 경로 변경하기

이 문서를 그대로 따라오셨다면 이미 수정돼있을겁니다.  
**satcounter_config.py** (아래 부분 수정)

```python
SQLALCHEMY_DATABASE_URI = 'sqlite:////tmp/test.db'
```

#### DB 생성하기

DB 파일을 만들고 테이블을 생성합니다. python shell에서 다음과 같이 입력합니다. virtualenv를 사용한다면 activate 후에 python shell을 실행하도록 합시다.

```python
>>> from application import db
>>> db.create_all()
```

#### DB 파일 권한 설정

저희 프로젝트에서는 파일 기반 데이터베이스를 이용하므로 애플리케이션 프로세스에서 DB 파일에 접근하고 쓸 권한을 주어야합니다.

```bash
sudo chgrp www-data /tmp/test.db
sudo chmod 660 /tmp/test.db
```

### nginx 설정하기

#### 설정 파일 작성

**/etc/nginx/sites-available/default**

```nginx
server {
	listen 80 default_server;

	server_name _;

	location / {
		include uwsgi_params;
		uwsgi_pass unix:/tmp/satcounter.sock;
	}

}
```

- Ln5: 별도로 수정하지 않았습니다. server*name을 `*`로 설정하면 모든 도메인을 받습니다.
- Ln7: uwsgi를 설정하는 데 필요한 parameters가 적혀 있는 `/etc/nginx/uwsgi_params` 파일을 include합니다.
- Ln8: Uwsgi와의 연결 설정 부분입니다. unix socket 파일을 생성해 통신하겠습니다. unix:/tmp/satcounter.sock 로 설정합니다. 이후 uwsgi 설정에서도 똑같은 파일을 지정해주어야합니다. uwsgi 프로세스에 의해 자동으로 생성·삭제되니 다른 디렉토리로 설정한다면 파일 생성 권한이 있는 디렉토리인지 확인해야합니다.
  만약에 한 서버 컴퓨터에서 여러 서버 애플리케이션를 돌린다면 sites-available 디렉토리에 애플리케이션별로 설정 파일을 만들고 sites-enabled 디렉토리에 심볼릭링크를 만들어 관리하면 됩니다. (관심 있으시다면 "virtualhost"를 찾아보세요!)

#### 변경한 설정 적용하기

nginx 서버를 재시작하고 변경한 설정을 적용합니다.

```bash
sudo systemctl restart nginx

## 또는
sudo service nginx restart
```

#### 서버 상태 확인하기

재시작 시 아무 메시지도 나오지 않고, 다음 명령어로 상태를 확인했을 때 정상이면 성공입니다. 실패했다면 `/var/log/nginx/error.log`의 에러 메시지가 원인을 파악하는 데 도움을 줄 겁니다.

```bash
sudo systemctl status nginx

## 또는
sudo service nginx status
```

### uwsgi 설정하기

#### 설정 파일 작성하기

**/etc/uwsgi/apps-available/satcounter.ini** (새로 생성)

```ini
[uwsgi]
vhost = true
plugins = python34
socket = /tmp/satcounter.sock
chmod-socket = 644
venv = /path/to/project/venv
chdir = /path/to/project
uid = www-data
gid = www-data
module = application
callable = app
```

- vhost: Virtualhost 설정입니다.
- plugins: uwsgi 서버에서 사용할 플러그인 리스트입니다. python34 플러그인을 사용합니다. (설치: apt-get install uwsgi-plugin-python3)
- socket: nginx 설정의 uwsgi_pass 에서 설정한 소켓 경로와 같아야합니다. nginx에서 이 소켓을 통해 uwsgi와 통신합니다.
- venv: virtualenv 경로입니다. 수업대로 따라하셨다면 프로젝트 경로 아래의 venv 디렉토리일겁니다.
- chdir: 실행 경로를 프로젝트 디렉토리로 수정합니다. 프로젝트 디렉토리에서 `pwd` 명령을 치면 확인하실 수 있습니다.
- uid: uwsgi 프로세스 실행 유저 설정입니다. www-data 계정으로 돌리겠습니다. (후에 `ps -ef | grep uwsgi` 명령으로 확인해보세요!)
- module: 작성한 소스파일의 파일명을 확장자 없이 쓰시면 됩니다. Flask app 객체가 있는 파일.
- callable: `Flask(__name__)`으로 만든 플라스크 앱을 가지고 있는 변수명을 쓰시면 됩니다. 대부분 `app` 으로 쓰고계실겁니다.

#### 활성화하기

일반적으로 apps-available 디렉토리에 애플리케이션 설정을 작성하고 apps-enabled 디렉토리에 심볼릭링크를 걸어 설정 파일을 관리합니다. uwsgi는 apps-enabled 디렉토리에 있는 설정 파일만 읽습니다. 다음 명령어를 실행해 심볼릭링크를 걸어봅시다.

```bash
sudo ln -s /etc/uwsgi/apps-available/satcounter.ini /etc/uwsgi/apps-enabled/satcounter.ini
```

#### 변경한 설정 적용하기

```bash
sudo systemctl restart uwsgi

## 또는
sudo service uwsgi restart
```

#### uwsgi 상태 확인하기

재시작 했을 때 에러 메시지가 출력되지 않고, 다음 명령어로 상태를 확인했을 때 정상이면 성공입니다. 실패했을 경우 `/var/log/uwsgi/app/<your-app>.log`가 도움이 될겁니다.

```bash
sudo systemctl status uwsgi

## 또는
sudo service uwsgi status
```

### 방화벽에서 HTTP 허용하기

시스템 방화벽과 서버 컴퓨터 방화벽에서 HTTP 포트(80)를 허용해줘야합니다. 위에서 말한 환경에서는 기본적으로 inactive 상태입니다.  
원래 방화벽을 활성화하고 사용하는 80번 포트만 개방해주어야하지만 생략하겠습니다.  
리눅스의 방화벽 설정이 궁금하시다면 **ufw**(Ubuntu), **iptables**를 공부하시면 됩니다.

### 접속하기

드디어 모든 설정이 끝났습니다! 접속해봅시다! ip주소는 `ifconfig` 명령으로 확인하실 수 있습니다.  
접속이 잘 안되거나 에러가 발생한다면 자주 발생할만한 오류를 봐주세요.

## 부록

### 자주 발생할만한 오류

- 접속했는데 아무 반응이 없습니다: 서버 컴퓨터까지 접근이 안될 가능성이 있습니다. 방화벽 설정을 잘 확인해보세요. 가상머신이라면 네트워크 어댑터 설정이 잘못됐을 수 있습니다.
- 502 Bad Gateway: uwsgi 설정이 잘못됐을 가능성이 높습니다. `/var/log/uwsgi/app/<your-app>.log` 파일을 확인해보세요. nginx 설정이 잘못됐을 가능성도 적지 않습니다. nginx 로그는 `/var/log/nginx` 디렉토리에 있습니다.
- 500 Internal Server Error: 여러분의 소스코드에 버그가 있을 가능성이 높습니다. 로컬에서는 문제가 없고 서버에서만 문제가 발생한다면 DB접근 권한이 없을 가능성도 있습니다.

### VirtualBox에서 네트워크 설정하기

#### Host-only 어댑터 새로 만들기

**VirtualBox 설정 > Network 탭 > Host-only Networks 탭**에서 +버튼을 눌러 새 Host-only 어댑터를 만듭니다. 이미 존재한다면 그걸 써도 좋습니다. 이 때 설정된 IPv4 Address와 서브넷마스크를 기억해둡시다.

#### 가상머신에 Host-only 어댑터 추가하기

1. 가상머신을 종료합니다.
2. **가상머신 설정 > Network > Adapter 2** (빈 Adapter)에서 **Enable Network Adapter**를 체크합니다.
3. **Attached to**를 **Host-only Adapter**로 설정합니다.
4. **Name**을 위에서 만든 어댑터로 설정합니다.
5. 가상머신을 부팅합니다.

#### 가상머신에서 어댑터 설정하기

다음 명령어로 어댑터 리스트와 새로 추가된 어댑터를 확인합니다.

```bash
ls /sys/class/net
```

새로 추가된 어댑터를 설정합니다.
**/etc/network/interfaces** (예시)

```
## Host-only interface
auto eth1
iface eth1 inet static
	address		192.168.56.20
	netmask		255.255.255.0
	network		192.168.56.0
	broadcast 	192.168.56.255
```

- Ln 3: `eth1` 자리에 새로 추가된 어댑터(인터페이스) 이름을 씁니다.
- Ln 4 address: 다른 호스트와 겹치지 않도록 이 호스트의 IP를 설정합니다. 나중에 이 IP로 서버에 접근합니다.
- netmask, network, broadcast는 따로 설명하지 않아도 될 것 같습니다.
