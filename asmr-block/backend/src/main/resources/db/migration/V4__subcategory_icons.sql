-- =====================================================
-- V4: 소분류 아이콘
--   편집기의 레고 블록은 작아서 색(대분류) + 아이콘(소분류)으로 구분함.
--   같은 자연(초록)이어도 비·바람·파도가 다른 아이콘으로 보이게.
--   값은 앱에서 쓰는 Ionicons 이름
-- =====================================================
UPDATE sound_category c SET icon = v.icon
FROM (VALUES
    ('비·물', 'rainy'), ('바람·숲', 'leaf'), ('바다·파도', 'water'),
    ('컬러 노이즈', 'pulse'), ('생활 소음', 'home'),
    ('카페·도시', 'cafe'), ('일본', 'train'), ('한국', 'location'),
    ('키보드·타자', 'keypad'), ('시계·기계', 'time'), ('명상·싱잉볼', 'notifications'),
    ('숨소리·심장', 'heart'), ('속삭임', 'chatbubble-ellipses'),
    ('요리', 'restaurant'), ('바삭·씹기', 'fast-food'),
    ('왁스·슬라임', 'color-fill'), ('커팅·부수기', 'cut')
) AS v(name, icon)
WHERE c.name = v.name AND c.parent_id IS NOT NULL;
