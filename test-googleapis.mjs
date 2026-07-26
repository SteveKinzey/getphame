// Test googleapis v171 OAuth2 API
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  'test_client_id',
  'test_client_secret',
  'https://getphame.app/api/auth/google/callback'
);

console.log('OAuth2 client created successfully');
console.log('Methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(oauth2Client)).filter(m => !m.startsWith('_')));

// Test generateAuthUrl
try {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    state: Buffer.from('https://getphame.app/api/auth/google/callback').toString('base64'),
  });
  console.log('\nAuth URL generated successfully');
  console.log('URL starts with:', url.substring(0, 80));
} catch (err) {
  console.error('generateAuthUrl failed:', err.message);
}

// Test getToken with a fake code (will fail with invalid_grant but shows the API works)
try {
  const result = await oauth2Client.getToken('fake_code');
  console.log('\ngetToken result:', result);
} catch (err) {
  console.log('\ngetToken error (expected with fake code):', err.message);
  console.log('Error type:', err.constructor.name);
  console.log('Error code:', err.code);
  console.log('Error status:', err.status);
  if (err.response) {
    console.log('Response data:', err.response.data);
  }
}
