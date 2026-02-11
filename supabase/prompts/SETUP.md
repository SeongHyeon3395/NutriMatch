# Gemini 프롬프트 설정

이 폴더의 텍스트를 Supabase Edge Functions Secrets로 올려서 사용합니다.

## 파일
- gemini_image_prompt.txt → `GEMINI_IMAGE_PROMPT`
- gemini_assistant_prompt.txt → `GEMINI_ASSISTANT_PROMPT`

## PowerShell로 Secrets 설정
프로젝트 루트(Front)에서:

```powershell
$img = Get-Content -Raw .\supabase\prompts\gemini_image_prompt.txt
$asst = Get-Content -Raw .\supabase\prompts\gemini_assistant_prompt.txt

# (권장) 줄바꿈 때문에 CLI에서 문제가 생기면 Base64로 올리세요.
$imgB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($img))
$asstB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($asst))

# 둘 중 하나 방식으로 설정
# 1) 원문 그대로
# npx supabase secrets set GEMINI_IMAGE_PROMPT="$img" GEMINI_ASSISTANT_PROMPT="$asst" --project-ref wrgeaabfsbjdgtjcwevv

# 2) Base64(권장)
npx supabase secrets set GEMINI_IMAGE_PROMPT_B64="$imgB64" GEMINI_ASSISTANT_PROMPT_B64="$asstB64" --project-ref wrgeaabfsbjdgtjcwevv
```

설정 후에는 함수 재배포가 필요할 수 있습니다:

```powershell
npx supabase functions deploy analyze-food-image --project-ref wrgeaabfsbjdgtjcwevv
```
