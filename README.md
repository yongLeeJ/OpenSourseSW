# 캘린더형 투두리스트 웹사이트

## 개요
이 프로젝트는 웹 기반의 투두리스트 및 일정 관리 캘린더 애플리케이션입니다.
React(프론트엔드)와 Flask(백엔드), SQLite(로컬 DB)를 통해
FullCalendar를 기반으로 작성하였습니다.


## 필요 환경 세팅
### 1. 백엔드 세팅 (윈도우 환경)

1. 깃 클론 및 경로 지정
``` git clone https://github.com/yongLeeJ/OpenSourseSW.git ```
``` cd /OpenSourseSW/BackEnd ```

2. Flask-CORS 설치
``` pip install flask-cors ```

### 2. 프론트엔드 세팅 (윈도우 환경)

1. 경로 지정
``` cd /OpenSourseSW/FrontEnd/src ```

2. node.js 설치 (필요 시)
https://nodejs.org/ - LTS 버전 설치

3. 권한 설정 (권한 문제 시)
* 관리자 권한 PowerShell 에서 아래 명령어 작성
``` Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned ```

4. 필요 nodemodule 설치
``` cd /OpenSourseSW/FrontEnd/src ``` 에서
``` npm install ```


## 서버 실행

* 기본적으로 백엔드는 localhost:5000, 프론트는 localhost:3000에서 실행됨

### 1. 백엔드 서버 실행
``` cd /OpenSourseSW/BackEnd ``` 경로에서
``` python hello.py ``` 

### 2. 프론트엔드 실행
``` cd /OpenSourseSW/FrontEnd/src ``` 에서
``` npm start ```


## 주요 기능

1. 일정 추가, 수정, 삭제

2. 캘린더에서 일정 시각화 (FullCalendar 기반)

3. 이번주/다음주 투두리스트 제공

4. 우선순위별 자동 정렬

5. 일정 완료/미완료 체크 토글

6. 태그별 색상 지정 및 분류

7. 이번달 투두리스트 진행률 원그래프(달성률)

8. 일정 정보 상세 모달/수정/삭제 드롭다운


