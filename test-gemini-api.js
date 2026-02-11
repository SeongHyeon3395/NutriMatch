// Gemini API 테스트 스크립트
const https = require('https');

async function testGeminiVision(apiKey) {
  // 간단한 테스트 이미지 (1x1 빨간색 픽셀)
  const testImageBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA7gAA=';
  
  const model = 'gemini-2.0-flash-exp';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: '이 이미지에 무엇이 보이나요? 한국어로 답해주세요.' },
        { 
          inline_data: { 
            mime_type: 'image/jpeg', 
            data: testImageBase64 
          } 
        }
      ]
    }],
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
  });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, error: 'JSON Parse Error', raw: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

async function testGeminiText(apiKey) {
  const model = 'gemini-2.0-flash-exp';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const body = JSON.stringify({
    contents: [{
      role: 'user',
      parts: [{ text: '안녕하세요! 짧게 인사해주세요.' }]
    }],
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 100 }
  });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, error: 'JSON Parse Error', raw: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

async function main() {
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.error('❌ Usage: node test-gemini-api.js <GEMINI_API_KEY>');
    process.exit(1);
  }

  console.log('🔍 Gemini API 테스트 시작...\n');
  console.log('API Key:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 5));
  console.log('─'.repeat(60));

  // 1. Text 모델 테스트
  console.log('\n📝 [TEST 1] Text 생성 테스트...');
  try {
    const textResult = await testGeminiText(apiKey);
    console.log('Status:', textResult.status);
    
    if (textResult.status === 200 && textResult.data?.candidates) {
      const response = textResult.data.candidates[0]?.content?.parts?.[0]?.text;
      console.log('✅ 성공!');
      console.log('응답:', response);
    } else if (textResult.data?.error) {
      console.log('❌ 실패!');
      console.log('에러:', JSON.stringify(textResult.data.error, null, 2));
    } else {
      console.log('⚠️  알 수 없는 응답:', JSON.stringify(textResult.data, null, 2).substring(0, 500));
    }
  } catch (e) {
    console.log('❌ 네트워크 에러:', e.message);
  }

  // 2. Vision 모델 테스트
  console.log('\n🖼️  [TEST 2] Vision(이미지) 분석 테스트...');
  try {
    const visionResult = await testGeminiVision(apiKey);
    console.log('Status:', visionResult.status);
    
    if (visionResult.status === 200 && visionResult.data?.candidates) {
      const response = visionResult.data.candidates[0]?.content?.parts?.[0]?.text;
      console.log('✅ 성공!');
      console.log('응답:', response);
    } else if (visionResult.data?.error) {
      console.log('❌ 실패!');
      console.log('에러:', JSON.stringify(visionResult.data.error, null, 2));
    } else {
      console.log('⚠️  알 수 없는 응답:', JSON.stringify(visionResult.data, null, 2).substring(0, 500));
    }
  } catch (e) {
    console.log('❌ 네트워크 에러:', e.message);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('✨ 테스트 완료!');
}

main();
