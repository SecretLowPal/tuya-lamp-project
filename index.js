const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

const CLIENT_ID = 'tsj8rffpnnfferva7uxa';
const CLIENT_SECRET = '55fc3ecc8f0b40cf878e93347d756adc';
const DEVICE_ID = 'bfb3d0f8751bb62a87ijmr';
const BASE_URL = 'https://openapi.tuyaeu.com'; 

function calculateSign(clientId, secret, t, accessToken, method, url, body) {
    const bodyStr = body ? JSON.stringify(body) : '';
    const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
    const stringToSign = `${method}\n${bodyHash}\n\n${url}`;
    const str = clientId + accessToken + t + stringToSign;
    return crypto.createHmac('sha256', secret).update(str).digest('hex').toUpperCase();
}

app.get('/light-blue', async (req, res) => {
    try {
        const t = Date.now().toString();

        // 1. קבלת טוקן
        const tokenUrl = '/v1.0/token?grant_type=1';
        const sign = calculateSign(CLIENT_ID, CLIENT_SECRET, t, '', 'GET', tokenUrl, '');

        const tokenRes = await axios.get(`${BASE_URL}${tokenUrl}`, {
            headers: { 'client_id': CLIENT_ID, 'sign': sign, 't': t, 'sign_method': 'HMAC-SHA256' }
        });

        if (!tokenRes.data.success) {
            return res.send(`שגיאת טוקן: ${tokenRes.data.msg}`);
        }

        const token = tokenRes.data.result.access_token;

        // 2. שליחת הפקודה המעודכנת למנורה
        const t2 = Date.now().toString();
        const cmdUrl = `/v1.0/devices/${DEVICE_ID}/commands`;
        
        // כאן תיקנתי את הפקודות: הדלקה -> מצב צבע -> צבע כחול
        const cmdBody = { 
            "commands": [
                { "code": "switch_led", "value": true },
                { "code": "work_mode", "value": "colour" },
                { "code": "colour_data_v2", "value": JSON.stringify({"h": 240, "s": 1000, "v": 1000}) }
            ] 
        };
        
        const sign2 = calculateSign(CLIENT_ID, CLIENT_SECRET, t2, token, 'POST', cmdUrl, cmdBody);

        const cmdRes = await axios.post(`${BASE_URL}${cmdUrl}`, cmdBody, {
            headers: {
                'client_id': CLIENT_ID,
                'access_token': token,
                'sign': sign2,
                't': t2,
                'sign_method': 'HMAC-SHA256',
                'Content-Type': 'application/json'
            }
        });

        if (cmdRes.data.success) {
            res.send("<h1>המנורה כחולה! 🔵</h1>");
        } else {
            res.send(`שגיאה בפקודה: ${cmdRes.data.msg}`);
        }

    } catch (err) {
        res.send(`שגיאת שרת: ${err.message}`);
    }
});

app.listen(PORT, () => {
    console.log('השרת פעיל! כנס לקישור: http://localhost:3000/light-blue');
});