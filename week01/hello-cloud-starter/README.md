# Cloud URL

클라우드 컴퓨팅 1~7주차 실습과 종합 과제를 연결한 Next.js URL 단축 서비스입니다.
수업의 week02~week07 예제 구조를 바탕으로 입력 검증, Neon 저장, 307 이동,
클릭 통계, 관리자 인증을 구현하고 동일 URL 재사용과 자기 서비스 URL 차단을 추가했습니다.
다른 주차의 원본 실습 자료는 그대로 보존합니다.

## 실행

Vercel의 Root Directory는 `week01/hello-cloud-starter`입니다.
로컬에서도 이 폴더에서 실행합니다.

```sh
npm install
npm test
npm run build
npm run dev
```

로컬에서는 `.env.local`, Vercel에서는 프로젝트의 Environment Variables에 다음을 등록합니다.
실제 값은 GitHub에 올리지 않습니다.

| 이름 | 내용 |
| --- | --- |
| `DATABASE_URL` | Neon Connect에서 복사한 pooled Postgres 연결 문자열 |
| `ADMIN_PASSWORD` | 직접 정한 관리자 비밀번호. 사용자 이름은 `admin` |

새 데이터베이스에는 `db/schema.sql`을 실행합니다. 이미 같은 테이블을 만들었다면 다시 초기화하지 않습니다.
Vercel의 환경변수 변경은 새 배포부터 적용됩니다.

## 동작

- `POST /api/shorten`: `{ "originalUrl": "https://example.com" }`.
  신규 저장은 201, 기존 주소 재사용은 200입니다. 응답은 `shortCode`, `shortUrl`, `originalUrl`, `reused`를 포함합니다.
- 주소는 앞뒤 공백을 제거한 문자열 그대로 보관합니다. 경로나 쿼리를 임의로 정규화하지 않습니다.
- 같은 URL의 동시 요청은 DB의 UNIQUE 제약과 upsert로 같은 코드를 반환합니다.
- 자기 hostname은 프로토콜/경로와 무관하게 400으로 차단합니다. 다른 Vercel hostname은 허용합니다.
- `GET /{shortCode}`는 307과 `Location`, `Cache-Control: no-store`를 반환합니다. 없는 코드는 404입니다.
- 클릭 수는 DB에서 직접 증가시키며, 클릭 기록 실패만으로 이동을 막지 않습니다.
- `/admin`은 Proxy에서, `/api/stats`는 Route Handler 안에서 각각 인증과 인가를 검사합니다.
  비밀번호가 없으면 접근을 거부합니다. 브라우저의 Basic 인증 창에 `admin`과 설정한 비밀번호를 입력합니다.
- 로그에는 사건 이름, 요청 ID, 단축코드, 상태를 남기며 원본 URL, 비밀번호, DB 오류 객체는 남기지 않습니다.

## 파일과 수업 연결

| 파일 | 역할 |
| --- | --- |
| `app/page.js` | 2주차 입력 화면, 3주차 API 호출 |
| `app/api/shorten/route.js`, `lib/handlers.js`, `lib/url.js` | 입력 검증, 응답, 자기 주소 차단 |
| `lib/short-code.js`, `lib/db.js` | 3주차 해시 코드, 4주차 저장과 중복 재사용 |
| `app/[shortCode]/route.js`, `lib/stats.js` | 5주차 이동, 6주차 클릭 기록과 통계 |
| `app/admin/page.js`, `app/api/stats/route.js` | 관리자 화면과 통계 API |
| `lib/auth.js`, `lib/authorization.js`, `proxy.js` | 7주차 인증과 인가 |

## Vercel Firewall 설정

7주차의 Rate Limit은 코드와 별도로 Vercel Firewall에서 설정해야 합니다.

- 조건: Request Path `/api/shorten` AND Request Method `POST`
- 동작: IP별 60초 동안 10회, 초과 시 429
- 배포 환경에서 제한 초과 응답을 확인합니다.

## 제출 전 점검

저장소 루트에서 공개 검사기를 Production URL에 실행합니다.

```sh
python -m pip install requests
python assignment/iscu_url_shortener_check.py --url https://cloud-url-shortener-five.vercel.app --interval 8
```

`npm test`는 DB 대역을 사용하는 HTTP 동작, 입력 검증, 인증의 단위 검사입니다.
실제 Neon 저장과 Vercel 배포 검증은 공개 검사기로 별도 수행해야 합니다.
관리자 로그인 성공, 통계 화면과 클릭 증가, Firewall 제한은 공개 검사기 범위 밖이므로 별도 확인합니다.

과제 기준: https://github.com/alifewellspent/iscu_cloud_class/blob/main/assignment/README.md
