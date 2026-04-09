-- Seed 2 example community posts for users who currently have no community posts.
-- Idempotent: does not duplicate same caption per user.

insert into public.community_posts (user_id, caption, image_url)
select
  u.id,
  v.caption,
  v.image_url
from auth.users u
join public.app_users a
  on a.id = u.id
cross join (
  values
    (
      '오늘 점심은 닭가슴살 샐러드 + 고구마 + 삶은 계란 1개! 탄수는 줄이고 단백질 비중 올렸더니 포만감이 오래가네요. 여러분 점심 뭐 드셨어요? #식단기록 #고단백',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80'
    ),
    (
      '야식 대신 따뜻한 차 + 견과류로 마무리 성공. 작은 선택이 내일 컨디션을 바꾸는 것 같아요. 야식 참는 팁 있으면 공유해주세요! #건강습관 #야식참기',
      'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80'
    )
) as v(caption, image_url)
where not exists (
  select 1
  from public.community_posts p
  where p.user_id = u.id
)
and not exists (
  select 1
  from public.community_posts p2
  where p2.user_id = u.id
    and p2.caption = v.caption
);
