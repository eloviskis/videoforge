import { createHmac } from 'crypto'
import axios from 'axios'

const KLING_ACCESS_KEY_ID = 'ACQgPpDadfgmNTLArT3GdLQrP8GEKH43'
const KLING_ACCESS_KEY_SECRET = 'FAykFFmhbKeHgKEeELhmpLLYMeBgpGD8'

function gerarKlingJWT(accessKeyId, accessKeySecret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ iss: accessKeyId, exp: now + 1800, nbf: now - 5 })).toString('base64url')
  const signature = createHmac('sha256', accessKeySecret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

const jwt = gerarKlingJWT(KLING_ACCESS_KEY_ID, KLING_ACCESS_KEY_SECRET)
console.log('✅ JWT gerado:', jwt.substring(0, 80) + '...')
console.log('🔑 Access Key:', KLING_ACCESS_KEY_ID)

// 1. Testar endpoint de saldo/conta
try {
  console.log('\n📊 Testando saldo da conta...')
  const accountResp = await axios.get(
    'https://api.klingai.com/account/costs',
    { headers: { 'Authorization': `Bearer ${jwt}` }, timeout: 15000 }
  )
  console.log('CONTA:', JSON.stringify(accountResp.data, null, 2))
} catch (err) {
  console.log('CONTA ERRO:', err.response?.status, JSON.stringify(err.response?.data))
}

// 2. Testar criação de vídeo
try {
  console.log('\n🎥 Testando criação de vídeo (modelo kling-v1)...')
  const resp = await axios.post(
    'https://api.klingai.com/v1/videos/text2video',
    {
      model: 'kling-v1',
      prompt: 'a sunset over mountains, cinematic',
      duration: '5',
      aspect_ratio: '16:9',
      mode: 'std',
      cfg_scale: 0.5,
    },
    {
      headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  )
  console.log('RESPOSTA:', JSON.stringify(resp.data, null, 2))
} catch (err) {
  console.error('ERRO HTTP status:', err.response?.status)
  console.error('ERRO BODY:', JSON.stringify(err.response?.data, null, 2))
  console.error('ERRO MSG:', err.message)
}
