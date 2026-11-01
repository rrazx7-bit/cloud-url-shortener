-- 새 Neon 프로젝트에서 한 번 실행합니다. 기존 데이터를 삭제하지 않습니다.
CREATE TABLE IF NOT EXISTS urls (
    short_code VARCHAR(6) PRIMARY KEY,
    original_url VARCHAR(2048) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    click_count BIGINT NOT NULL DEFAULT 0,
    last_clicked_at TIMESTAMPTZ
);
