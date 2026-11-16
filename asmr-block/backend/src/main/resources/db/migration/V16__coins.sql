-- =====================================================
-- V16: 코인 (지갑 · 쓴 내역 · 블록 구매 · 크리에이터 수익 · 정산)
--   코인은 두 가지: coin_paid = 돈 내고 충전한 코인(스토어 결제가 열리면), coin_bonus = 받은 코인(관리자 지급·이벤트)
--   쓸 때는 받은 코인부터. 크리에이터 몫은 "충전 코인으로 팔린 부분"만 (받은 코인은 진짜 돈이 아니라서 정산에 안 들어감)
--   block_purchase: 블록 구매 기록 (누가·무엇을·몇 코인, 크리에이터 몫, 정산했는지)
--   coin_transaction: 코인이 늘고 준 내역 (지급·구매·충전·환불), 충전은 스토어 영수증 번호(external_id)로 두 번 안 들어가게
--   creator_settlement: 관리자가 크리에이터에게 정산(송금)했다고 표시한 기록
-- =====================================================
ALTER TABLE users ADD COLUMN coin_paid INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN coin_bonus INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD CONSTRAINT chk_users_coins CHECK (coin_paid >= 0 AND coin_bonus >= 0);
COMMENT ON COLUMN users.coin_paid IS '충전한 코인 (돈 낸 것)';
COMMENT ON COLUMN users.coin_bonus IS '받은 코인 (관리자 지급·이벤트, 먼저 씀, 정산 안 됨)';

CREATE TABLE creator_settlement (
    id          BIGSERIAL PRIMARY KEY,
    creator_id  BIGINT       NOT NULL REFERENCES users(id),
    coins       INTEGER      NOT NULL CHECK (coins > 0),
    krw         INTEGER      NOT NULL CHECK (krw >= 0),
    note        VARCHAR(200),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_creator_settlement_creator ON creator_settlement (creator_id, created_at DESC);

CREATE TABLE block_purchase (
    id             BIGSERIAL PRIMARY KEY,
    buyer_id       BIGINT     REFERENCES users(id) ON DELETE SET NULL,
    block_id       BIGINT     NOT NULL REFERENCES block(id),
    creator_id     BIGINT     REFERENCES users(id) ON DELETE SET NULL,
    price          INTEGER    NOT NULL CHECK (price > 0),
    bonus_coins    INTEGER    NOT NULL CHECK (bonus_coins >= 0),
    paid_coins     INTEGER    NOT NULL CHECK (paid_coins >= 0),
    creator_share  INTEGER    NOT NULL DEFAULT 0 CHECK (creator_share >= 0),
    settlement_id  BIGINT     REFERENCES creator_settlement(id),
    created_at     TIMESTAMP  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_block_purchase_split CHECK (bonus_coins + paid_coins = price),
    CONSTRAINT uq_block_purchase UNIQUE (buyer_id, block_id)
);
CREATE INDEX idx_block_purchase_creator ON block_purchase (creator_id, created_at DESC);
CREATE INDEX idx_block_purchase_unsettled ON block_purchase (creator_id) WHERE settlement_id IS NULL AND creator_share > 0;
COMMENT ON COLUMN block_purchase.creator_share IS '크리에이터 몫 = 충전 코인 × app.coins.creator-share-percent (내림)';

CREATE TABLE coin_transaction (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type           VARCHAR(20)  NOT NULL,
    paid_amount    INTEGER      NOT NULL DEFAULT 0,
    bonus_amount   INTEGER      NOT NULL DEFAULT 0,
    balance_after  INTEGER      NOT NULL CHECK (balance_after >= 0),
    block_id       BIGINT       REFERENCES block(id),
    purchase_id    BIGINT       REFERENCES block_purchase(id),
    note           VARCHAR(200),
    external_id    VARCHAR(200) UNIQUE,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_coin_transaction_type CHECK (type IN ('GRANT', 'PURCHASE', 'CHARGE', 'REFUND'))
);
CREATE INDEX idx_coin_transaction_user ON coin_transaction (user_id, created_at DESC, id DESC);
COMMENT ON COLUMN coin_transaction.paid_amount IS '충전 코인 변화 (+ 늘어남 / - 줄어듦)';
COMMENT ON COLUMN coin_transaction.bonus_amount IS '받은 코인 변화 (+ 늘어남 / - 줄어듦)';
COMMENT ON COLUMN coin_transaction.external_id IS '스토어 결제 영수증 번호 (같은 결제를 두 번 넣지 않게)';
